"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  getBook,
  getBookSettings,
  getProgress,
  getTodayStats,
  touchBookOpened,
} from "@/lib/db/index";
import type { BookRecord, ProgressLocator } from "@/lib/db/types";
import { getBookFile } from "@/lib/storage/files";
import {
  estimateMinutesLeft,
  formatEta,
} from "@/lib/stats/reading";
import { ReaderChrome } from "./ReaderChrome";
import { DictionaryPopup } from "./DictionaryPopup";
import type { EpubReaderActions } from "./EpubReader";
import type { WordLookupAnchor } from "@/lib/reading/dictionary";
import type { ProgressDetail } from "@/lib/reading/epub-progress";
import {
  findTocIndexByHref,
  tocChapterDisplayIndex,
  tocChapterTotal,
} from "@/lib/reading/epub-toc";

const EpubReader = dynamic(
  () => import("./EpubReader").then((m) => m.EpubReader),
  { ssr: false },
);
const PdfReader = dynamic(
  () => import("./PdfReader").then((m) => m.PdfReader),
  { ssr: false },
);
const TxtReader = dynamic(
  () => import("./TxtReader").then((m) => m.TxtReader),
  { ssr: false },
);
const MobiReader = dynamic(
  () => import("./MobiReader").then((m) => m.MobiReader),
  { ssr: false },
);

type ReaderViewProps = {
  bookId: string;
};

export function ReaderView({ bookId }: ReaderViewProps) {
  const [book, setBook] = useState<BookRecord | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [chapterPercent, setChapterPercent] = useState(0);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chapterTotal, setChapterTotal] = useState(1);
  const [locator, setLocator] = useState<ProgressLocator | null>(null);
  const [eta, setEta] = useState("—");
  const [chromeVisible, setChromeVisible] = useState(true);
  const [tocItems, setTocItems] = useState<{ label: string; href: string }[]>(
    [],
  );
  const [tocSelect, setTocSelect] = useState<string | null>(null);
  const [locatorJump, setLocatorJump] = useState<ProgressLocator | null>(null);
  const [currentHref, setCurrentHref] = useState<string | null>(null);
  const [resumeToast, setResumeToast] = useState<string | null>(null);
  const [dictWord, setDictWord] = useState<string | null>(null);
  const [dictAnchor, setDictAnchor] = useState<WordLookupAnchor | null>(null);
  const lastContentTapRef = useRef(0);
  const pendingProgressRef = useRef<{
    loc: ProgressLocator;
    pct: number;
  } | null>(null);
  const progressRafRef = useRef(0);
  const epubActionsRef = useRef<EpubReaderActions | null>(null);

  const showChrome = useCallback(() => setChromeVisible(true), []);

  const onReaderContentTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (dictWord || chromeVisible) return;
      if ((e.target as Element).closest("button, a, input, iframe")) return;
      const now = Date.now();
      if (now - lastContentTapRef.current < 400) {
        setChromeVisible(true);
        lastContentTapRef.current = 0;
      } else {
        lastContentTapRef.current = now;
      }
    },
    [chromeVisible, dictWord],
  );

  const onReaderContentDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (dictWord || chromeVisible) return;
      if ((e.target as Element).closest("button, a, input, iframe")) return;
      setChromeVisible(true);
    },
    [chromeVisible, dictWord],
  );

  useEffect(() => {
    if (!resumeToast) return;
    const t = setTimeout(() => setResumeToast(null), 2500);
    return () => clearTimeout(t);
  }, [resumeToast]);

  useEffect(() => {
    setBook(null);
    setBuffer(null);
    setText(null);
    setFile(null);
    setError(null);
    setPercent(0);
    setChapterPercent(0);
    setChapterIndex(0);
    setChapterTotal(1);
    setLocator(null);
    setCurrentHref(null);
    setTocItems([]);
    setTocSelect(null);
    setLocatorJump(null);
    epubActionsRef.current = null;
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const record = await getBook(bookId);
      if (!record) {
        if (!cancelled) setError("Book not found");
        return;
      }

      const blob = await getBookFile(bookId);
      if (!blob) {
        if (!cancelled) setError("Book file missing from storage");
        return;
      }

      const [progress, todayMin] = await Promise.all([
        getProgress(bookId),
        getTodayStats(),
        getBookSettings(bookId),
      ]);

      await touchBookOpened(bookId);

      if (!cancelled) {
        setBook(record);
        if (progress) {
          setPercent(progress.percent);
          setChapterPercent(progress.percent);
          setLocator(progress.locator);
          setEta(
            formatEta(estimateMinutesLeft(progress.percent, todayMin)),
          );
        }

        if (record.format === "txt") {
          setText(await blob.text());
        } else if (record.format === "mobi") {
          setFile(
            new File([blob], record.fileName, {
              type: "application/x-mobipocket-ebook",
            }),
          );
        } else {
          setBuffer(await blob.arrayBuffer());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const onProgress = useCallback((loc: ProgressLocator, detail: ProgressDetail) => {
    setLocator(loc);
    pendingProgressRef.current = { loc, pct: detail.bookPercent };
    setChapterPercent(detail.chapterPercent);
    setChapterIndex(detail.chapterIndex);
    setChapterTotal(detail.chapterTotal);
    if (progressRafRef.current) return;
    progressRafRef.current = requestAnimationFrame(() => {
      progressRafRef.current = 0;
      const pending = pendingProgressRef.current;
      if (!pending) return;
      setPercent(pending.pct);
      getTodayStats().then((mins) => {
        setEta(formatEta(estimateMinutesLeft(pending.pct, mins)));
      });
    });
  }, []);

  const onEpubHighlight = useCallback(async () => {
    return (await epubActionsRef.current?.highlightSelection()) ?? false;
  }, []);

  const openWordLookup = useCallback((word: string, anchor: WordLookupAnchor) => {
    setDictWord(word);
    setDictAnchor(anchor);
    setChromeVisible(false);
  }, []);

  const closeWordLookup = useCallback(() => {
    setDictWord(null);
    setDictAnchor(null);
  }, []);

  const defineFromSelection = useCallback(() => {
    const raw =
      epubActionsRef.current?.getSelectedText() ??
      window.getSelection()?.toString().trim() ??
      "";
    const word =
      raw
        .split(/\s+/)
        .map((part) => part.replace(/^['’-]+|['’-]+$/g, ""))
        .find((part) => /^[\p{L}\p{M}]/u.test(part)) ?? "";
    if (!word) return false;
    openWordLookup(word, {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.32,
    });
    return true;
  }, [openWordLookup]);

  const onLocation = useCallback((href: string) => {
    setCurrentHref(href);
  }, []);

  const chapterIdx = useMemo(() => {
    if (book?.format === "epub" && tocItems.length > 0) {
      const fromHref = findTocIndexByHref(tocItems, currentHref);
      return fromHref >= 0 ? fromHref : 0;
    }
    return chapterIndex;
  }, [book?.format, tocItems, currentHref, chapterIndex]);

  const displayedChapterTotal =
    book?.format === "epub" && tocItems.length > 0
      ? tocChapterTotal(tocItems)
      : chapterTotal;
  const displayedChapterIndex =
    book?.format === "epub" && tocItems.length > 0
      ? tocChapterDisplayIndex(tocItems, chapterIdx)
      : chapterIdx;

  const jumpChapter = useCallback((idx: number) => {
    const item = tocItems[idx];
    if (item) {
      setTocSelect(item.href);
      showChrome();
    }
  }, [tocItems, showChrome]);

  if (error) {
    return (
      <div className="reader-shell flex flex-col items-center justify-center gap-4">
        <p className="text-fg-muted">{error}</p>
        <a href="/" className="label-caps border border-border px-4 py-2 hover:bg-bg-panel-hover">
          ← LIBRARY
        </a>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="reader-shell flex items-center justify-center">
        <p className="label-caps text-fg-muted">Opening book...</p>
      </div>
    );
  }

  return (
    <div
      className="reader-shell"
      data-chrome-visible={chromeVisible ? "true" : "false"}
    >
      <div
        className="reader-content"
        onTouchEnd={onReaderContentTouchEnd}
        onDoubleClick={onReaderContentDoubleClick}
        role="presentation"
      >
        {book.format === "epub" && buffer && (
          <EpubReader
            bookId={bookId}
            data={buffer}
            onProgress={onProgress}
            onLocation={onLocation}
            onToc={setTocItems}
            tocJump={tocSelect}
            onTocJumped={() => setTocSelect(null)}
            locatorJump={locatorJump}
            onLocatorJumped={() => setLocatorJump(null)}
            onResumed={(pct) =>
              setResumeToast(`Resumed at ${Math.round(pct)}%`)
            }
            onActionsReady={(actions) => {
              epubActionsRef.current = actions;
            }}
            onShowChrome={showChrome}
          />
        )}
        {book.format === "pdf" && buffer && (
          <PdfReader bookId={bookId} data={buffer} onProgress={onProgress} />
        )}
        {book.format === "txt" && text && (
          <TxtReader bookId={bookId} text={text} onProgress={onProgress} />
        )}
        {book.format === "mobi" && file && (
          <MobiReader bookId={bookId} file={file} onProgress={onProgress} />
        )}
      </div>

      <ReaderChrome
        bookId={bookId}
        title={book.title}
        author={book.author}
        percent={percent}
        chapterPercent={chapterPercent}
        chapterIndex={displayedChapterIndex}
        chapterTotal={displayedChapterTotal || 1}
        eta={eta}
        locator={locator}
        visible={chromeVisible}
        onHide={() => setChromeVisible(false)}
        onShowChrome={showChrome}
        tocItems={tocItems}
        currentChapter={chapterIdx}
        onTocSelect={(href) => {
          setTocSelect(href);
          showChrome();
        }}
        onPrevChapter={() => jumpChapter(chapterIdx - 1)}
        onNextChapter={() => jumpChapter(chapterIdx + 1)}
        hasPrevChapter={chapterIdx > 0}
        hasNextChapter={chapterIdx < tocItems.length - 1}
        onBookmarkSelect={(loc) => {
          setLocatorJump(loc);
          showChrome();
        }}
        onHighlight={book.format === "epub" ? onEpubHighlight : undefined}
        onDefineWord={defineFromSelection}
      />

      <DictionaryPopup
        word={dictWord}
        anchor={dictAnchor}
        onClose={closeWordLookup}
      />

      {resumeToast && (
        <div className="reader-toast">{resumeToast}</div>
      )}
    </div>
  );
}
