"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { nanoid } from "@/lib/util/nanoid";
import { addBookmark, addHighlight, putBookSettings } from "@/lib/db/index";
import type { ProgressLocator } from "@/lib/db/types";
import { useSettings } from "@/app/providers";

type ReaderToolbarProps = {
  bookId: string;
  title: string;
  author: string;
  format: string;
  percent: number;
  eta: string;
  locator: ProgressLocator | null;
  hidden: boolean;
  onToggleChrome: () => void;
  tocItems?: { label: string; href: string }[];
  onTocSelect?: (href: string) => void;
};

export function ReaderToolbar({
  bookId,
  title,
  author,
  format,
  percent,
  eta,
  locator,
  hidden,
  onToggleChrome,
  tocItems,
  onTocSelect,
}: ReaderToolbarProps) {
  const { readingMode } = useSettings();
  const [panel, setPanel] = useState<"none" | "toc">("none");

  const addBookmarkHere = useCallback(async () => {
    if (!locator) return;
    await addBookmark({
      id: nanoid(),
      bookId,
      label: `Mark ${Math.round(percent)}%`,
      locator,
      createdAt: Date.now(),
    });
  }, [bookId, locator, percent]);

  const highlightSelection = useCallback(async () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || !locator) return;
    const note = window.prompt("Note (optional):") ?? undefined;
    await addHighlight({
      id: nanoid(),
      bookId,
      text,
      note: note || undefined,
      color: "gray",
      locator,
      createdAt: Date.now(),
    });
    sel?.removeAllRanges();
  }, [bookId, locator]);

  const saveModeForBook = useCallback(async () => {
    await putBookSettings({ bookId, readingMode });
  }, [bookId, readingMode]);

  return (
    <div className={`reader-chrome shrink-0 ${hidden ? "hidden" : ""}`}>
      <header className="border-b border-border bg-bg-panel px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="label-caps text-fg-muted hover:text-fg">
            ← BACK
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate label-caps">{title}</p>
            <p className="tag truncate">
              {author} · {Math.round(percent)}% · {eta}
            </p>
          </div>
          <span className="tag shrink-0">[{format}]</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Btn label="HIDE" onClick={onToggleChrome} />
          <Btn label="MARK" onClick={addBookmarkHere} />
          <Btn label="HL" onClick={highlightSelection} />
          <Btn label="SAVE MODE" onClick={saveModeForBook} />
          {tocItems && tocItems.length > 0 && (
            <Btn
              label="TOC"
              onClick={() => setPanel((p) => (p === "toc" ? "none" : "toc"))}
            />
          )}
        </div>
      </header>

      {panel === "toc" && tocItems && (
        <div className="max-h-40 overflow-y-auto border-b border-border bg-bg-overlay">
          {tocItems.map((item) => (
            <button
              key={item.href}
              type="button"
              className="block w-full border-b border-border-light px-4 py-2 text-left hover:bg-bg-panel-hover"
              onClick={() => {
                onTocSelect?.(item.href);
                setPanel("none");
              }}
            >
              <span className="symbol">+ </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Btn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="label-caps border border-border px-2 py-0.5 hover:bg-bg-panel-hover"
    >
      {label}
    </button>
  );
}
