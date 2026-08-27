"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/app/providers";
import { getBookSettings, getProgress } from "@/lib/db/index";
import type { ProgressLocator } from "@/lib/db/types";
import { useReadingTime } from "@/lib/hooks/useReadingTime";
import { saveProgressDebounced, flushProgressSave } from "@/lib/reading/progress";
import {
  chapterEstimatePercent,
  measureEpubChapterProgress,
  normalizeEpubPercent,
  type ProgressDetail,
} from "@/lib/reading/epub-progress";
import {
  findTocIndexByHref,
  tocChapterTotal,
  type TocItem,
} from "@/lib/reading/epub-toc";
import {
  EPUB_HIGHLIGHT_CLASS,
  restoreEpubHighlights,
  toggleEpubHighlight,
  type EpubSelection,
} from "@/lib/reading/epub-highlights";
import { throttle } from "@/lib/util/throttle";
import type { FontId, ReadingMode } from "@/lib/theme";

type EpubReaderProps = {
  bookId: string;
  data: ArrayBuffer;
  onProgress?: (locator: ProgressLocator, detail: ProgressDetail) => void;
  onLocation?: (href: string) => void;
  onToc?: (items: { label: string; href: string }[]) => void;
  tocJump?: string | null;
  onTocJumped?: () => void;
  locatorJump?: ProgressLocator | null;
  onLocatorJumped?: () => void;
  onResumed?: (percent: number) => void;
  onActionsReady?: (actions: EpubReaderActions) => void;
  onShowChrome?: () => void;
};

export type EpubReaderActions = {
  highlightSelection: () => Promise<"added" | "removed" | false>;
  getSelectedText: () => string | null;
};

const FONT_FAMILY_MAP: Record<FontId, string> = {
  jetbrains: '"JetBrains Mono"',
  geist: '"Geist Mono"',
  ibm: '"IBM Plex Mono"',
  space: '"Space Mono"',
};

function fontFamilyFor(font: FontId): string {
  return `${FONT_FAMILY_MAP[font]}, ui-monospace, monospace`;
}

// Collect @font-face rules from the parent doc, rewriting relative src URLs
// to absolute so they resolve inside the epubjs blob iframe.
function collectFontFaceCss(fontId: FontId): string {
  const family = FONT_FAMILY_MAP[fontId].replace(/"/g, "");
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      if (!rule.style.fontFamily.includes(family)) continue;
      const base = sheet.href ?? document.baseURI;
      const css = rule.cssText.replace(
        /url\(\s*(['"]?)([^'")]+)\1\s*\)/g,
        (_m, _q, url) => {
          try {
            return `url("${new URL(url, base).href}")`;
          } catch {
            return `url("${url}")`;
          }
        },
      );
      out.push(css);
    }
  }
  return out.join("\n");
}

function flowForMode(mode: string): string {
  switch (mode) {
    case "paginated":
      return "paginated";
    default:
      return "scrolled-continuous";
  }
}

function managerForMode(mode: string): string {
  // Continuous manager stitches sections together for uninterrupted scroll.
  return mode === "paginated" ? "default" : "continuous";
}

function flattenToc(
  items: {
    label: string;
    href: string;
    subitems?: { label: string; href: string }[];
  }[],
): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  for (const item of items) {
    out.push({ label: item.label, href: item.href });
    if (item.subitems) out.push(...flattenToc(item.subitems));
  }
  return out;
}

function useEffectiveReadingMode(
  bookId: string,
  globalMode: ReadingMode,
): ReadingMode {
  const [mode, setMode] = useState(globalMode);
  useEffect(() => {
    getBookSettings(bookId).then((s) => {
      setMode(s?.readingMode ?? globalMode);
    });
  }, [bookId, globalMode]);
  return mode;
}

function readThemeColors(): { fg: string; bg: string } {
  const cs = getComputedStyle(document.documentElement);
  return {
    fg: cs.getPropertyValue("--fg").trim() || "#c8c8c8",
    bg: cs.getPropertyValue("--bg").trim() || "#161616",
  };
}

type ReaderStyleOptions = {
  fontId: FontId;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margin: number;
};

const fontFaceCache: Partial<Record<FontId, string>> = {};
const contentCssCache = new Map<string, string>();

function cssCacheKey(
  opts: ReaderStyleOptions,
  fg: string,
  bg: string,
): string {
  return `v4:${opts.fontId}:${opts.fontSize}:${opts.lineHeight}:${opts.margin}:${fg}:${bg}`;
}

function getFontFaceCss(fontId: FontId): string {
  if (!fontFaceCache[fontId]) {
    fontFaceCache[fontId] = collectFontFaceCss(fontId);
  }
  return fontFaceCache[fontId]!;
}

function measureHost(el: HTMLElement): { width: number; height: number } {
  const shell = el.closest(".reader-shell");
  if (shell && shell.clientHeight > 0 && shell.clientWidth > 0) {
    return { width: shell.clientWidth, height: shell.clientHeight };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function buildContentCss(opts: ReaderStyleOptions): string {
  const { fg, bg } = readThemeColors();
  const key = cssCacheKey(opts, fg, bg);
  const cached = contentCssCache.get(key);
  if (cached) return cached;

  const css = `
    ${getFontFaceCss(opts.fontId)}
    html, body {
      color: ${fg} !important;
      background: ${bg} !important;
      font-family: ${opts.fontFamily} !important;
      overflow: hidden !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
    }
    body {
      font-size: ${opts.fontSize}px !important;
      line-height: ${opts.lineHeight} !important;
      padding-left: ${opts.margin}px !important;
      padding-right: ${opts.margin}px !important;
      padding-top: 1rem !important;
      padding-bottom: 2rem !important;
      display: block !important;
      user-select: text !important;
      -webkit-user-select: text !important;
    }
    body, p, div, span, li, td, th, blockquote, h1, h2, h3, h4, h5, h6 {
      color: ${fg} !important;
      background-color: transparent !important;
      font-family: ${opts.fontFamily} !important;
    }
    body > div,
    body > section,
    figure {
      min-height: 0 !important;
      height: auto !important;
      display: block !important;
    }
    a { color: ${fg} !important; }
    /* Cover / chapter art — upscale small publisher thumbnails */
    img {
      display: block !important;
      margin: 1.25rem auto !important;
      object-fit: contain !important;
      width: min(100%, 18rem) !important;
      max-width: min(100%, 18rem) !important;
      max-height: min(55vh, 30rem) !important;
      height: auto !important;
    }
    /* Inline illustrations stay with text */
    p img, span img, a img, li img, td img {
      display: inline-block !important;
      width: auto !important;
      max-width: 100% !important;
      max-height: min(40vh, 20rem) !important;
      margin: 0.5rem auto !important;
      vertical-align: middle;
    }
    .${EPUB_HIGHLIGHT_CLASS} {
      fill: rgba(220, 200, 80, 0.45) !important;
      fill-opacity: 0.45 !important;
    }
  `;
  contentCssCache.set(key, css);
  return css;
}

// Many web-novel EPUBs center covers in a full-viewport flex box.
function normalizePublisherLayout(doc: Document) {
  for (const el of doc.querySelectorAll<HTMLElement>("[style]")) {
    const s = el.style;
    if (s.minHeight && /100|vh/i.test(s.minHeight)) s.minHeight = "";
    if (s.height && /100|vh/i.test(s.height)) s.height = "";
    if (s.display === "flex" && el.querySelector("img, svg")) {
      s.display = "block";
    }
  }

  for (const img of doc.querySelectorAll<HTMLImageElement>("img")) {
    img.loading = "lazy";
    img.decoding = "async";
    img.removeAttribute("width");
    img.removeAttribute("height");
    if (img.style.height && /100|vh/i.test(img.style.height)) {
      img.style.height = "";
    }
    if (img.style.minHeight) img.style.minHeight = "";
    if (img.style.maxHeight && /100|vh/i.test(img.style.maxHeight)) {
      img.style.maxHeight = "";
    }
  }
}

function reflowEpubSections(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
  scrollContainer?: HTMLElement | null,
  /** Only re-measure the last loaded section (cheaper during scroll). */
  tailOnly = false,
) {
  try {
    const views = rendition?.manager?.views?.all?.() ?? [];
    const targets = tailOnly && views.length > 0 ? [views[views.length - 1]] : views;
    for (const view of targets) {
      view.expand?.(true);
    }
    if (scrollContainer) {
      requestAdjacentChapters(scrollContainer, rendition);
    }
  } catch {
    // ignore
  }
}

function attachImageReflow(
  doc: Document,
  requestReflow: () => void,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      normalizePublisherLayout(doc);
      requestReflow();
    }, 80);
  };

  for (const img of doc.querySelectorAll("img")) {
    if (img.complete) continue;
    img.addEventListener("load", schedule, { once: true });
    img.addEventListener("error", schedule, { once: true });
  }
}

// Wheel/touch over chapter iframes don't bubble to the outer scroll container —
// forward them so the book scrolls inside a fixed viewport.
const forwardedDocs = new WeakSet<Document>();

function attachScrollForwarding(
  doc: Document,
  scrollContainer: HTMLElement,
  onAfterScroll?: () => void,
) {
  if (forwardedDocs.has(doc)) return;
  forwardedDocs.add(doc);

  const notify = () => {
    onAfterScroll?.();
  };

  doc.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      const prev = scrollContainer.scrollTop;
      scrollContainer.scrollTop += e.deltaY;
      scrollContainer.scrollLeft += e.deltaX;
      e.preventDefault();
      if (scrollContainer.scrollTop !== prev) {
        notify();
      } else {
        // At scroll edge — still try to load the next chapter.
        notify();
      }
    },
    { passive: false },
  );

  let lastTouchY = 0;
  doc.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );
  doc.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const delta = lastTouchY - y;
      if (Math.abs(delta) < 8) return;
      scrollContainer.scrollTop += delta;
      lastTouchY = y;
      e.preventDefault();
      notify();
    },
    { passive: false },
  );
  doc.addEventListener("touchend", () => {
    lastTouchY = 0;
  });
}

const CHAPTER_LOAD_THRESHOLD_PX = 600;

function requestAdjacentChapters(
  scrollContainer: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
) {
  const manager = rendition?.manager;
  if (!manager?.check) return;

  const { scrollTop, clientHeight, scrollHeight } = scrollContainer;
  const remaining = scrollHeight - scrollTop - clientHeight;

  if (remaining < CHAPTER_LOAD_THRESHOLD_PX || scrollTop < CHAPTER_LOAD_THRESHOLD_PX) {
    void manager.check();
  }
}

function resolveBookPercent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  location: { start?: { percentage?: number; index?: number } } | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  book: any,
): number {
  const fromLoc = normalizeEpubPercent(location?.start?.percentage);
  if (fromLoc > 0) return fromLoc;
  const spineLen = book?.spine?.length ?? 0;
  return chapterEstimatePercent(location?.start?.index, spineLen);
}

function buildProgressDetail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  book: any,
  scrollContainer: HTMLElement | null,
  toc: TocItem[],
): ProgressDetail {
  const bookPercent = resolveBookPercent(rendition?.location, book);
  const href = rendition?.location?.start?.href;
  const tocIndex = findTocIndexByHref(toc, href);
  const scrollChapter = scrollContainer
    ? measureEpubChapterProgress(scrollContainer, rendition)
    : {
        chapterPercent: 0,
        chapterIndex: rendition?.location?.start?.index ?? 0,
        chapterTotal: book?.spine?.length ?? 1,
      };

  const chapterIndex =
    toc.length > 0 ? (tocIndex >= 0 ? tocIndex : 0) : scrollChapter.chapterIndex;
  const chapterTotal =
    toc.length > 0 ? tocChapterTotal(toc) : scrollChapter.chapterTotal;

  return {
    bookPercent,
    chapterIndex,
    chapterPercent: scrollChapter.chapterPercent,
    chapterTotal,
  };
}

function injectContentStyle(
  doc: Document,
  opts: ReaderStyleOptions,
  onReflow?: () => void,
) {
  const css = buildContentCss(opts);
  let style = doc.getElementById("reader-theme") as HTMLStyleElement | null;
  if (style) {
    if (style.textContent !== css) style.textContent = css;
  } else {
    style = doc.createElement("style");
    style.id = "reader-theme";
    style.textContent = css;
    doc.head.appendChild(style);
  }
  normalizePublisherLayout(doc);
  if (onReflow) {
    attachImageReflow(doc, onReflow);
  }
}

function applyReaderTheme(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
  opts: ReaderStyleOptions,
) {
  const { fg, bg } = readThemeColors();

  rendition.themes.register("reader", {
    body: {
      "font-size": `${opts.fontSize}px !important`,
      "line-height": `${opts.lineHeight} !important`,
      "padding-left": `${opts.margin}px !important`,
      "padding-right": `${opts.margin}px !important`,
      "font-family": `${opts.fontFamily} !important`,
      color: `${fg} !important`,
      background: `${bg} !important`,
    },
    p: { color: `${fg} !important`, "font-family": `${opts.fontFamily} !important` },
    div: { color: `${fg} !important`, "font-family": `${opts.fontFamily} !important` },
    span: { color: `${fg} !important`, "font-family": `${opts.fontFamily} !important` },
    h1: { color: `${fg} !important` },
    h2: { color: `${fg} !important` },
    h3: { color: `${fg} !important` },
    h4: { color: `${fg} !important` },
    h5: { color: `${fg} !important` },
    h6: { color: `${fg} !important` },
    a: { color: `${fg} !important` },
    img: {
      width: "min(100%, 18rem) !important",
      "max-width": "min(100%, 18rem) !important",
      "max-height": "min(55vh, 30rem) !important",
      height: "auto !important",
      display: "block !important",
      margin: "1.25rem auto !important",
      "object-fit": "contain !important",
    },
  });
  rendition.themes.select("reader");
}

// Push the current style into every already-rendered section iframe.
function patchRenderedContents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
  opts: ReaderStyleOptions,
  scrollContainer?: HTMLElement | null,
) {
  const reflow = () => reflowEpubSections(rendition, scrollContainer, true);
  try {
    const contents = rendition?.getContents?.() ?? [];
    for (const c of contents) {
      if (c?.document) injectContentStyle(c.document, opts, reflow);
    }
  } catch {
    // ignore
  }
}

export function EpubReader({
  bookId,
  data,
  onProgress,
  onLocation,
  onToc,
  tocJump,
  onTocJumped,
  locatorJump,
  onLocatorJumped,
  onResumed,
  onActionsReady,
  onShowChrome,
}: EpubReaderProps) {
  const { readingMode: globalMode, font, fontSize, lineHeight, margin, theme } =
    useSettings();
  const mode = useEffectiveReadingMode(bookId, globalMode);
  const fontFamily = fontFamilyFor(font);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renditionRef = useRef<any>(null);
  const onProgressRef = useRef(onProgress);
  const onLocationRef = useRef(onLocation);
  const onTocRef = useRef(onToc);
  const onActionsReadyRef = useRef(onActionsReady);
  const onShowChromeRef = useRef(onShowChrome);
  const lastSelectionRef = useRef<EpubSelection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useReadingTime(true);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onTocRef.current = onToc;
  }, [onToc]);

  useEffect(() => {
    onLocationRef.current = onLocation;
  }, [onLocation]);

  useEffect(() => {
    onActionsReadyRef.current = onActionsReady;
  }, [onActionsReady]);

  useEffect(() => {
    onShowChromeRef.current = onShowChrome;
  }, [onShowChrome]);

  useEffect(() => {
    if (!tocJump || !renditionRef.current) return;
    renditionRef.current
      .display(tocJump)
      .then(() => renditionRef.current?.manager?.check?.())
      .then(() => onTocJumped?.());
  }, [tocJump, onTocJumped]);

  useEffect(() => {
    if (!locatorJump || locatorJump.type !== "epub" || !renditionRef.current) {
      return;
    }
    renditionRef.current
      .display(locatorJump.cfi)
      .then(() => renditionRef.current?.manager?.check?.())
      .then(() => onLocatorJumped?.());
  }, [locatorJump, onLocatorJumped]);

  useEffect(() => {
    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rendition: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let book: any = null;
    let onKey: ((e: KeyboardEvent) => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let onScrollLoad: (() => void) | null = null;
    let onManagerResized: (() => void) | null = null;
    const chapterLoadRef: { schedule: (() => void) | null } = { schedule: null };
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const ePub = (await import("epubjs")).default;
        const buffer = data.slice(0);
        book = ePub(buffer);
        await book.opened;

        if (destroyed || !containerRef.current) {
          book.destroy();
          return;
        }

        const nav = await book.loaded.navigation;
        const toc = flattenToc(nav.toc);
        onTocRef.current?.(toc);

        const host = containerRef.current;
        const { width, height } = measureHost(host);
        host.style.width = `${width}px`;
        host.style.height = `${height}px`;

        const styleOpts: ReaderStyleOptions = {
          fontId: font,
          fontFamily,
          fontSize,
          lineHeight,
          margin,
        };

        rendition = book.renderTo(host, {
          width,
          height,
          flow: flowForMode(mode),
          manager: managerForMode(mode),
          spread: "none",
          allowScriptedContent: false,
          overflow: "scroll",
          offset: 700,
          offsetDelta: 350,
        });

        rendition.hooks.content.register(
          (contents: { document: Document; window?: Window }) => {
            const scrollContainer = host.querySelector(
              ".epub-container",
            ) as HTMLElement | null;
            const reflow = () =>
              reflowEpubSections(rendition, scrollContainer, true);
            injectContentStyle(contents.document, styleOpts, reflow);
            if (scrollContainer) {
              attachScrollForwarding(
                contents.document,
                scrollContainer,
                () => chapterLoadRef.schedule?.(),
              );
            }

            let lastTap = 0;
            contents.document.addEventListener("touchend", (e) => {
              const selection = contents.document.getSelection()?.toString().trim();
              if (selection) return;

              const now = Date.now();
              if (now - lastTap < 400) {
                onShowChromeRef.current?.();
                lastTap = 0;
              } else {
                lastTap = now;
              }
            });

            contents.document.addEventListener("dblclick", () => {
              const selection = contents.document.getSelection()?.toString().trim();
              if (selection) return;
              onShowChromeRef.current?.();
            });
          },
        );
        applyReaderTheme(rendition, styleOpts);

        const progress = await getProgress(bookId);
        if (progress?.locator.type === "epub") {
          await rendition.display(progress.locator.cfi);
          onResumed?.(progress.percent);
        } else {
          await rendition.display();
        }

        const initialHref = rendition.location?.start?.href;
        if (initialHref) {
          onLocationRef.current?.(initialHref);
        }

        rendition.resize(width, height);

        // Stitch adjacent chapters into one continuous scroll range.
        const scrollContainer = host.querySelector(
          ".epub-container",
        ) as HTMLElement | null;

        void rendition.manager?.check?.();
        reflowEpubSections(rendition, scrollContainer);

        if (scrollContainer) {
          scrollContainer.style.overflowY = "auto";
          scrollContainer.style.overflowX = "hidden";
          const onScroll = throttle(() => {
            requestAdjacentChapters(scrollContainer, () => renditionRef.current);
            const r = renditionRef.current;
            if (!r?.location?.start) return;
            const locator: ProgressLocator = {
              type: "epub",
              cfi: r.location.start.cfi,
            };
            const detail = buildProgressDetail(r, book, scrollContainer, toc);
            saveProgressDebounced(bookId, locator, detail.bookPercent);
            onProgressRef.current?.(locator, detail);
            if (r.location.start.href) {
              onLocationRef.current?.(r.location.start.href);
            }
            void r.reportLocation?.();
          }, 250);
          chapterLoadRef.schedule = onScroll;
          onScrollLoad = onScroll;
          scrollContainer.addEventListener("scroll", onScrollLoad, {
            passive: true,
          });
          onScroll();
        }

        onManagerResized = throttle(() => {
          if (scrollContainer) {
            requestAdjacentChapters(scrollContainer, rendition);
          }
        }, 250);
        rendition.manager?.on?.("resized", onManagerResized);

        rendition.on("selected", (cfiRange: string, contents: { document: Document }) => {
          const text =
            contents.document?.defaultView?.getSelection()?.toString().trim() ??
            "";
          if (text && cfiRange) {
            lastSelectionRef.current = { cfiRange, text };
          }
        });

        rendition.on(
          "relocated",
          (location: {
            start: {
              cfi: string;
              percentage?: number;
              index?: number;
              href?: string;
            };
          }) => {
            rendition.location = location;
            const locator: ProgressLocator = {
              type: "epub",
              cfi: location.start.cfi,
            };
            const scrollContainer = host.querySelector(
              ".epub-container",
            ) as HTMLElement | null;
            const detail = buildProgressDetail(rendition, book, scrollContainer, toc);
            saveProgressDebounced(bookId, locator, detail.bookPercent);
            onProgressRef.current?.(locator, detail);
            if (location.start.href) {
              onLocationRef.current?.(location.start.href);
            }
          },
        );

        rendition.on("rendered", () => {
          void restoreEpubHighlights(bookId, rendition);
        });

        renditionRef.current = rendition;

        onActionsReadyRef.current?.({
          highlightSelection: async () => {
            const sel = lastSelectionRef.current;
            if (!sel?.cfiRange) return false;
            const result = await toggleEpubHighlight(
              bookId,
              rendition,
              sel.cfiRange,
              sel.text,
            );
            for (const c of rendition.getContents?.() ?? []) {
              c.document?.defaultView?.getSelection()?.removeAllRanges();
            }
            lastSelectionRef.current = null;
            return result;
          },
          getSelectedText: () => {
            const cached = lastSelectionRef.current?.text?.trim();
            if (cached) return cached;
            for (const c of rendition.getContents?.() ?? []) {
              const text =
                c.document?.defaultView?.getSelection()?.toString().trim() ??
                "";
              if (text) return text;
            }
            return null;
          },
        });

        void book.locations.generate(2048).then(() => {
          if (!destroyed) void rendition.reportLocation();
        });

        void rendition.reportLocation();

        const onResize = throttle(() => {
          if (!containerRef.current || !renditionRef.current) return;
          const next = measureHost(containerRef.current);
          containerRef.current.style.width = `${next.width}px`;
          containerRef.current.style.height = `${next.height}px`;
          renditionRef.current.resize(next.width, next.height);
        }, 200);
        const ro = new ResizeObserver(onResize);
        const shell = host.closest(".reader-shell");
        if (shell) ro.observe(shell);
        else if (host.parentElement) ro.observe(host.parentElement);
        resizeObserver = ro;

        onKey = (e: KeyboardEvent) => {
          if (e.key === "ArrowRight" || e.key === "PageDown") {
            e.preventDefault();
            void rendition.next();
          } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
            e.preventDefault();
            void rendition.prev();
          }
        };
        window.addEventListener("keydown", onKey);

        setLoading(false);
      } catch (err) {
        if (!destroyed) {
          setError(
            err instanceof Error ? err.message : "Failed to open EPUB",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      destroyed = true;
      flushProgressSave(bookId);
      if (onKey) window.removeEventListener("keydown", onKey);
      const scrollEl = containerRef.current?.querySelector(".epub-container");
      if (scrollEl && onScrollLoad) {
        scrollEl.removeEventListener("scroll", onScrollLoad);
      }
      if (onManagerResized) {
        rendition?.manager?.off?.("resized", onManagerResized);
      }
      resizeObserver?.disconnect();
      rendition?.destroy();
      book?.destroy();
      renditionRef.current = null;
    };
    // Recreate the rendition only when the book or the reading mode changes.
    // Style-only changes are applied live in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, data, mode]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    const styleOpts: ReaderStyleOptions = {
      fontId: font,
      fontFamily,
      fontSize,
      lineHeight,
      margin,
    };
    applyReaderTheme(rendition, styleOpts);
    const host = containerRef.current;
    const scrollContainer = host?.querySelector(
      ".epub-container",
    ) as HTMLElement | null;
    patchRenderedContents(rendition, styleOpts, scrollContainer);
  }, [font, fontFamily, fontSize, lineHeight, margin, theme]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-fg-muted">
        <p className="text-center">
          <span className="symbol">+ </span>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-0">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg">
          <p className="label-caps text-fg-muted">Opening...</p>
        </div>
      )}
      <div
        ref={containerRef}
        className={`epub-host h-full w-full ${mode === "scroll-strip" ? "epub-strip" : ""}`}
      />
    </div>
  );
}
