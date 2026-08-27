"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/app/providers";
import { getProgress } from "@/lib/db/index";
import type { ProgressLocator } from "@/lib/db/types";
import { useReadingTime } from "@/lib/hooks/useReadingTime";
import { saveProgressDebounced } from "@/lib/reading/progress";
import { singleSectionProgress, type ProgressDetail } from "@/lib/reading/epub-progress";
import { ReaderTypography } from "./ReaderTypography";

type TxtReaderProps = {
  bookId: string;
  text: string;
  onProgress?: (locator: ProgressLocator, detail: ProgressDetail) => void;
};

export function TxtReader({ bookId, text, onProgress }: TxtReaderProps) {
  const { readingMode, fontSize, lineHeight, margin } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useReadingTime(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const progress = await getProgress(bookId);
      if (cancelled || !containerRef.current) return;

      if (progress?.locator.type === "txt") {
        containerRef.current.scrollTop = progress.locator.offset;
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

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
          type: "txt",
          offset: el.scrollTop,
        };
        saveProgressDebounced(bookId, locator, percent);
        onProgress?.(locator, singleSectionProgress(percent));
      }, 400);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [bookId, ready, onProgress]);

  return (
    <ReaderTypography
      fontSize={fontSize}
      lineHeight={lineHeight}
      margin={margin}
      readingMode={readingMode}
      className="h-full"
    >
      <div ref={containerRef} className="reader-viewport h-full">
        <pre className="reader-text whitespace-pre-wrap wrap-break-word">
          {text}
        </pre>
      </div>
    </ReaderTypography>
  );
}
