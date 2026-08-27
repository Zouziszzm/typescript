"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { nanoid } from "@/lib/util/nanoid";
import { addBookmark, addHighlight, getBookmarks, getHighlights, removeBookmark, removeHighlight } from "@/lib/db/index";
import type { BookmarkRecord, ProgressLocator } from "@/lib/db/types";
import { useSettings } from "@/app/providers";
import { FONT_OPTIONS, type FontId } from "@/lib/theme";

type TocItem = { label: string; href: string };

type ReaderChromeProps = {
  bookId: string;
  title: string;
  author: string;
  percent: number;
  chapterPercent: number;
  chapterIndex: number;
  chapterTotal: number;
  eta: string;
  locator: ProgressLocator | null;
  visible: boolean;
  onHide: () => void;
  onShowChrome: () => void;
  tocItems: TocItem[];
  currentChapter: number;
  onTocSelect: (href: string) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onBookmarkSelect: (locator: ProgressLocator) => void;
  onHighlight?: () => Promise<"added" | "removed" | false>;
  onDefineWord?: () => boolean;
};

export function ReaderChrome({
  bookId,
  title,
  author,
  percent,
  chapterPercent,
  chapterIndex,
  chapterTotal,
  eta,
  locator,
  visible,
  onHide,
  onShowChrome,
  tocItems,
  currentChapter,
  onTocSelect,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
  onBookmarkSelect,
  onHighlight,
  onDefineWord,
}: ReaderChromeProps) {
  const {
    font,
    setFont,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    theme,
    setTheme,
    readingMode,
  } = useSettings();
  const [drawer, setDrawer] = useState<"none" | "chapters" | "bookmarks" | "settings">(
    "none",
  );
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const refreshBookmarks = useCallback(async () => {
    setBookmarks(await getBookmarks(bookId));
  }, [bookId]);

  const addBookmarkHere = useCallback(async () => {
    if (!locator) return;
    await addBookmark({
      id: nanoid(),
      bookId,
      label: `Mark ${Math.round(percent)}%`,
      locator,
      createdAt: Date.now(),
    });
    showToast("Bookmark saved");
    void refreshBookmarks();
  }, [bookId, locator, percent, showToast, refreshBookmarks]);

  const highlightSelection = useCallback(async () => {
    if (onHighlight) {
      const result = await onHighlight();
      if (result === "added") showToast("Highlighted");
      else if (result === "removed") showToast("Highlight removed");
      else showToast("Select text first");
      return;
    }
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || !locator) {
      showToast("Select text first");
      return;
    }
    const existing = (await getHighlights(bookId)).find(
      (h) => h.text.trim() === text,
    );
    if (existing) {
      await removeHighlight(existing.id);
      sel?.removeAllRanges();
      showToast("Highlight removed");
      return;
    }
    await addHighlight({
      id: nanoid(),
      bookId,
      text,
      color: "gray",
      locator,
      createdAt: Date.now(),
    });
    sel?.removeAllRanges();
    showToast("Highlighted");
  }, [bookId, locator, onHighlight, showToast]);

  const defineWord = useCallback(() => {
    if (onDefineWord?.()) return;
    showToast("Select a word first");
  }, [onDefineWord, showToast]);

  const closeDrawer = useCallback(() => setDrawer("none"), []);

  useEffect(() => {
    if (drawer === "bookmarks" || drawer === "chapters") {
      void refreshBookmarks();
    }
  }, [drawer, refreshBookmarks]);

  return (
    <>
      {/* Tap zones for prev/next chapter — only in paginated mode */}
      {readingMode === "paginated" && (
        <>
          <button
            type="button"
            aria-label="Previous chapter"
            disabled={!hasPrevChapter}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasPrevChapter) return;
              onPrevChapter();
            }}
            className={`reader-tap-zone reader-tap-zone-left ${
              !visible ? "reader-tap-zone-active" : ""
            }`}
          />
          <button
            type="button"
            aria-label="Next chapter"
            disabled={!hasNextChapter}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasNextChapter) return;
              onNextChapter();
            }}
            className={`reader-tap-zone reader-tap-zone-right ${
              !visible ? "reader-tap-zone-active" : ""
            }`}
          />
        </>
      )}

      <footer
        className={`reader-dock reader-overlay reader-overlay-bottom ${
          visible ? "reader-overlay-visible" : ""
        }`}
      >
        <div className="reader-dock-header">
          <Link
            href="/"
            className="reader-icon-btn shrink-0"
            title="Back to library"
            onClick={(e) => e.stopPropagation()}
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{title}</p>
            <p className="truncate text-xs text-fg-muted leading-tight">
              {tocItems[currentChapter]?.label ?? "Reading"}
              {chapterTotal > 1
                ? ` · Ch ${chapterIndex + 1}/${chapterTotal}`
                : ""}
              {eta !== "—" ? ` · ${eta}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="reader-icon-btn shrink-0"
            title="Hide controls"
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
          >
            ⌄
          </button>
          <button
            type="button"
            className="reader-icon-btn shrink-0"
            title="Chapters & bookmarks"
            onClick={(e) => {
              e.stopPropagation();
              setDrawer((d) => (d === "chapters" ? "none" : "chapters"));
            }}
          >
            ☰
          </button>
          <button
            type="button"
            className="reader-icon-btn shrink-0"
            title="Reading settings"
            onClick={(e) => {
              e.stopPropagation();
              setDrawer((d) => (d === "settings" ? "none" : "settings"));
            }}
          >
            Aa
          </button>
        </div>

        <div className="reader-dock-progress">
          {chapterTotal > 1 && (
            <div className="reader-progress-block">
              <div className="reader-progress-meta">
                <span className="reader-progress-label">Chapter</span>
                <span>{Math.round(chapterPercent)}%</span>
              </div>
              <div className="reader-progress-track reader-progress-track-chapter">
                <div
                  className="reader-progress-fill reader-progress-fill-chapter"
                  style={{
                    width: `${Math.min(100, Math.max(0, chapterPercent))}%`,
                  }}
                />
              </div>
            </div>
          )}
          <div className="reader-progress-block">
            <div className="reader-progress-meta">
              <span className="reader-progress-label">
                {chapterTotal > 1 ? "Book" : "Progress"}
              </span>
              <span>{Math.round(percent)}%</span>
            </div>
            <div className="reader-progress-track reader-progress-track-book">
              <div
                className="reader-progress-fill reader-progress-fill-book"
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="reader-dock-actions">
          <button
            type="button"
            className="reader-dock-btn"
            disabled={!hasPrevChapter}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasPrevChapter) return;
              onPrevChapter();
            }}
          >
            <span className="reader-dock-btn-icon" aria-hidden>
              ←
            </span>
            <span>Prev</span>
          </button>
          <button
            type="button"
            className="reader-dock-btn"
            onClick={(e) => {
              e.stopPropagation();
              void addBookmarkHere();
            }}
          >
            <span className="reader-dock-btn-icon" aria-hidden>
              ★
            </span>
            <span>Mark</span>
          </button>
          <button
            type="button"
            className="reader-dock-btn"
            onClick={(e) => {
              e.stopPropagation();
              void highlightSelection();
            }}
          >
            <span className="reader-dock-btn-icon" aria-hidden>
              ✎
            </span>
            <span>Highlight</span>
          </button>
          <button
            type="button"
            className="reader-dock-btn"
            onClick={(e) => {
              e.stopPropagation();
              defineWord();
            }}
          >
            <span className="reader-dock-btn-icon" aria-hidden>
              ?
            </span>
            <span>Define</span>
          </button>
          <button
            type="button"
            className="reader-dock-btn"
            disabled={!hasNextChapter}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasNextChapter) return;
              onNextChapter();
            }}
          >
            <span className="reader-dock-btn-icon" aria-hidden>
              →
            </span>
            <span>Next</span>
          </button>
        </div>
      </footer>

      {/* Chapter drawer */}
      {drawer === "chapters" && (
        <ChapterDrawer
          items={tocItems}
          current={currentChapter}
          bookmarks={bookmarks}
          onSelect={(href) => {
            onTocSelect(href);
            closeDrawer();
          }}
          onBookmarkSelect={(loc) => {
            onBookmarkSelect(loc);
            closeDrawer();
          }}
          onDeleteBookmark={async (id) => {
            await removeBookmark(id);
            void refreshBookmarks();
          }}
          onClose={closeDrawer}
        />
      )}

      {/* Settings drawer */}
      {drawer === "settings" && (
        <SettingsDrawer
          font={font}
          fontSize={fontSize}
          lineHeight={lineHeight}
          theme={theme}
          onFont={setFont}
          onFontSize={setFontSize}
          onLineHeight={setLineHeight}
          onTheme={setTheme}
          onClose={closeDrawer}
        />
      )}

      {toast && <div className="reader-toast">{toast}</div>}
    </>
  );
}

function ChapterDrawer({
  items,
  current,
  bookmarks,
  onSelect,
  onBookmarkSelect,
  onDeleteBookmark,
  onClose,
}: {
  items: TocItem[];
  current: number;
  bookmarks: BookmarkRecord[];
  onSelect: (href: string) => void;
  onBookmarkSelect: (locator: ProgressLocator) => void;
  onDeleteBookmark: (id: string) => void;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"chapters" | "bookmarks">("chapters");

  useEffect(() => {
    if (tab !== "chapters") return;
    const el = listRef.current?.querySelector("[data-active=true]");
    el?.scrollIntoView({ block: "center" });
  }, [current, tab]);

  return (
    <>
      <button
        type="button"
        aria-label="Close panel"
        className="reader-drawer-backdrop"
        onClick={onClose}
      />
      <aside className="reader-drawer reader-drawer-left">
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("chapters")}
              className={`reader-pill-btn text-xs ${
                tab === "chapters" ? "bg-bg-overlay" : ""
              }`}
            >
              Chapters
            </button>
            <button
              type="button"
              onClick={() => setTab("bookmarks")}
              className={`reader-pill-btn text-xs ${
                tab === "bookmarks" ? "bg-bg-overlay" : ""
              }`}
            >
              Marks ({bookmarks.length})
            </button>
          </div>
          <button type="button" onClick={onClose} className="reader-icon-btn">
            ×
          </button>
        </div>
        <div ref={listRef} className="overflow-y-auto overscroll-contain">
          {tab === "chapters" &&
            items.map((item, i) => (
              <button
                key={item.href}
                type="button"
                data-active={i === current}
                onClick={() => onSelect(item.href)}
                className={`block w-full border-b border-border-light px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg-panel-hover ${
                  i === current ? "bg-bg-overlay font-medium" : ""
                }`}
              >
                {item.label}
              </button>
            ))}
          {tab === "bookmarks" &&
            (bookmarks.length === 0 ? (
              <p className="px-4 py-6 text-sm text-fg-muted">
                No bookmarks yet. Tap Mark to save your place.
              </p>
            ) : (
              bookmarks.map((mark) => (
                <div
                  key={mark.id}
                  className="flex items-center gap-2 border-b border-border-light px-4 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => onBookmarkSelect(mark.locator)}
                    className="min-w-0 flex-1 text-left text-sm hover:text-fg"
                  >
                    <span className="block truncate">{mark.label}</span>
                    <span className="text-xs text-fg-muted">
                      {new Date(mark.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete bookmark"
                    onClick={() => onDeleteBookmark(mark.id)}
                    className="reader-icon-btn shrink-0 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))
            ))}
        </div>
      </aside>
    </>
  );
}

function SettingsDrawer({
  font,
  fontSize,
  lineHeight,
  theme,
  onFont,
  onFontSize,
  onLineHeight,
  onTheme,
  onClose,
}: {
  font: FontId;
  fontSize: number;
  lineHeight: number;
  theme: string;
  onFont: (f: FontId) => void;
  onFontSize: (n: number) => void;
  onLineHeight: (n: number) => void;
  onTheme: (t: "paper" | "terminal" | "sepia" | "slate" | "auto") => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close settings"
        className="reader-drawer-backdrop"
        onClick={onClose}
      />
      <aside className="reader-drawer reader-drawer-right">
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
          <span className="label-caps">Reading</span>
          <button type="button" onClick={onClose} className="reader-icon-btn">
            ×
          </button>
        </div>
        <div className="space-y-4 px-4 py-4">
          <div>
            <p className="tag mb-2">FONT</p>
            <div className="flex flex-wrap gap-1">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFont(f.id)}
                  className={`reader-pill-btn text-xs ${
                    font === f.id ? "bg-bg-overlay" : ""
                  }`}
                >
                  {f.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="tag mb-2">SIZE — {fontSize}px</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="reader-icon-btn"
                onClick={() => onFontSize(Math.max(12, fontSize - 2))}
              >
                −
              </button>
              <input
                type="range"
                min={12}
                max={28}
                step={1}
                value={fontSize}
                onChange={(e) => onFontSize(Number(e.target.value))}
                className="flex-1"
              />
              <button
                type="button"
                className="reader-icon-btn"
                onClick={() => onFontSize(Math.min(28, fontSize + 2))}
              >
                +
              </button>
            </div>
          </div>
          <div>
            <p className="tag mb-2">LINE HEIGHT — {lineHeight}</p>
            <div className="flex flex-wrap gap-1">
              {[1.4, 1.6, 1.8, 2.0].map((lh) => (
                <button
                  key={lh}
                  type="button"
                  onClick={() => onLineHeight(lh)}
                  className={`reader-pill-btn text-xs ${
                    lineHeight === lh ? "bg-bg-overlay" : ""
                  }`}
                >
                  {lh}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="tag mb-2">THEME</p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["paper", "Paper"],
                  ["terminal", "Dark"],
                  ["sepia", "Sepia"],
                  ["slate", "Slate"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTheme(id)}
                  className={`reader-pill-btn text-xs ${
                    theme === id ? "bg-bg-overlay" : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Link
            href="/settings"
            className="tag block pt-2 hover:text-fg"
            onClick={onClose}
          >
            More settings →
          </Link>
        </div>
      </aside>
    </>
  );
}
