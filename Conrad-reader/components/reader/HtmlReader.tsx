"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/app/providers";
import { getProgress } from "@/lib/db/index";
import type { ProgressLocator } from "@/lib/db/types";
import { useReadingTime } from "@/lib/hooks/useReadingTime";
import { saveProgressDebounced } from "@/lib/reading/progress";
import {
  measureSectionProgress,
  singleSectionProgress,
  type ProgressDetail,
} from "@/lib/reading/epub-progress";
import { ReaderTypography } from "./ReaderTypography";

type HtmlReaderProps = {
  bookId: string;
  html: string;
  initialChapterId?: string;
  initialOffset?: number;
  onProgress?: (locator: ProgressLocator, detail: ProgressDetail) => void;
};

export function HtmlReader({
  bookId,
  html,
  initialChapterId,
  initialOffset = 0,
  onProgress,
}: HtmlReaderProps) {
  const { readingMode, fontSize, lineHeight, margin } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useReadingTime(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const progress = await getProgress(bookId);
      if (cancelled || !containerRef.current) return;

      if (progress?.locator.type === "mobi") {
        containerRef.current.scrollTop = progress.locator.offset;
      } else if (initialOffset) {
        containerRef.current.scrollTop = initialOffset;
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId, initialOffset]);

  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;

    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const max = el.scrollHeight - el.clientHeight;
        const percent = max > 0 ? (el.scrollTop / max) * 100 : 0;
        const locator: ProgressLocator = {
          type: "mobi",
          chapterId: initialChapterId ?? "0",
          offset: el.scrollTop,
        };
        saveProgressDebounced(bookId, locator, percent);
        const sections = el.querySelectorAll(".reader-html > *").length;
        if (sections > 1) {
          const chapter = measureSectionProgress(el, ".reader-html > *");
          onProgress?.(locator, {
            bookPercent: percent,
            chapterPercent: chapter.chapterPercent,
            chapterIndex: chapter.chapterIndex,
            chapterTotal: sections,
          });
        } else {
          onProgress?.(locator, singleSectionProgress(percent));
        }
      }, 400);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [bookId, ready, initialChapterId, onProgress]);

  return (
    <ReaderTypography
      fontSize={fontSize}
      lineHeight={lineHeight}
      margin={margin}
      readingMode={readingMode}
      className="h-full"
    >
      <div ref={containerRef} className="reader-viewport h-full">
        <div
          className="reader-html"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </ReaderTypography>
  );
}
