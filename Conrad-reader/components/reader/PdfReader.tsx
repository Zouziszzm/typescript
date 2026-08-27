"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/app/providers";
import { getProgress } from "@/lib/db/index";
import type { ProgressLocator } from "@/lib/db/types";
import { useReadingTime } from "@/lib/hooks/useReadingTime";
import { saveProgressDebounced } from "@/lib/reading/progress";
import {
  measureSectionProgress,
  pagedProgress,
  type ProgressDetail,
} from "@/lib/reading/epub-progress";
import { loadPdfJs } from "@/lib/pdf/setup-pdfjs";
import { renderPdfPage } from "@/lib/pdf/render-page";
import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfReaderProps = {
  bookId: string;
  data: ArrayBuffer;
  onProgress?: (locator: ProgressLocator, detail: ProgressDetail) => void;
};

export function PdfReader({
  bookId,
  data,
  onProgress,
}: PdfReaderProps) {
  const { readingMode } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [ready, setReady] = useState(false);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  useReadingTime(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ data }).promise;
      if (cancelled) return;

      docRef.current = doc;
      setNumPages(doc.numPages);

      const progress = await getProgress(bookId);
      const startPage =
        progress?.locator.type === "pdf" ? progress.locator.page : 1;

      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";

      if (readingMode === "paginated") {
        container.className =
          "pdf-paginated flex h-full items-center justify-center overflow-hidden";
        const wrapper = await renderPdfPage(doc, startPage, 1.5, "pdf-page");
        container.appendChild(wrapper);
        setCurrentPage(startPage);
        const loc: ProgressLocator = { type: "pdf", page: startPage };
        const detail = pagedProgress(startPage - 1, doc.numPages);
        saveProgressDebounced(bookId, loc, detail.bookPercent);
        onProgress?.(loc, detail);
        setReady(true);
        return;
      }

      const isStrip = readingMode === "scroll-strip";
      container.className = isStrip
        ? "pdf-strip flex h-full gap-4 overflow-x-auto overflow-y-hidden px-4 py-4"
        : "pdf-scroll flex h-full flex-col gap-4 overflow-y-auto px-4 py-4";

      for (let i = 1; i <= doc.numPages; i++) {
        const wrapper = await renderPdfPage(
          doc,
          i,
          isStrip ? 1.0 : 1.5,
          isStrip ? "pdf-page shrink-0" : "pdf-page mx-auto w-full max-w-3xl",
        );
        container.appendChild(wrapper);

        if (i === startPage) {
          wrapper.scrollIntoView(isStrip ? { inline: "start" } : undefined);
        }
      }

      setReady(true);
    })();

    return () => {
      cancelled = true;
      setReady(false);
    };
  }, [bookId, data, onProgress, readingMode]);

  useEffect(() => {
    if (readingMode === "paginated" || numPages === 0) return;
    const el = containerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const chapter = measureSectionProgress(el, ".pdf-page");
        const page = chapter.chapterIndex + 1;
        const locator: ProgressLocator = { type: "pdf", page };
        const bookPercent =
          numPages > 0
            ? ((chapter.chapterIndex + chapter.chapterPercent / 100) /
                numPages) *
              100
            : 0;
        const detail: ProgressDetail = {
          bookPercent,
          chapterPercent: chapter.chapterPercent,
          chapterIndex: chapter.chapterIndex,
          chapterTotal: numPages,
        };
        saveProgressDebounced(bookId, locator, detail.bookPercent);
        onProgress?.(locator, detail);
        setCurrentPage(page);
      }, 200);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [bookId, numPages, onProgress, readingMode, ready]);

  const goToPage = async (page: number) => {
    const doc = docRef.current;
    const container = containerRef.current;
    if (!doc || !container) return;

    const next = Math.min(doc.numPages, Math.max(1, page));
    setCurrentPage(next);
    container.innerHTML = "";
    const wrapper = await renderPdfPage(doc, next, 1.5, "pdf-page");
    container.appendChild(wrapper);

    const locator: ProgressLocator = { type: "pdf", page: next };
    const detail = pagedProgress(next - 1, doc.numPages);
    saveProgressDebounced(bookId, locator, detail.bookPercent);
    onProgress?.(locator, detail);
  };

  if (readingMode === "paginated" && numPages > 0) {
    return (
      <div className="flex h-full flex-col">
        <div ref={containerRef} className="flex flex-1 items-center justify-center" />
        <div className="flex items-center justify-between border-t border-border bg-bg-panel px-4 py-2">
          <button
            type="button"
            className="label-caps px-3 py-1 hover:bg-bg-panel-hover disabled:opacity-40"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            ← PREV
          </button>
          <span className="tag">
            {currentPage} / {numPages}
          </span>
          <button
            type="button"
            className="label-caps px-3 py-1 hover:bg-bg-panel-hover disabled:opacity-40"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            NEXT →
          </button>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full" />;
}
