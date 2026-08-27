"use client";

import { useEffect, useState } from "react";
import { initKf8File, initMobiFile } from "@lingo-reader/mobi-parser";
import { HtmlReader } from "./HtmlReader";
import type { ProgressDetail } from "@/lib/reading/epub-progress";

type MobiReaderProps = {
  bookId: string;
  file: File;
  onProgress?: (
    locator: import("@/lib/db/types").ProgressLocator,
    detail: ProgressDetail,
  ) => void;
};

export function MobiReader({ bookId, file, onProgress }: MobiReaderProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      try {
        let content = "";

        try {
          const kf8 = await initKf8File(file);
          const spine = kf8.getSpine();
          for (const chapter of spine) {
            const loaded = kf8.loadChapter(chapter.id);
            if (loaded?.html) content += loaded.html;
          }
          kf8.destroy();
        } catch {
          const mobi = await initMobiFile(file);
          const spine = mobi.getSpine();
          for (const chapter of spine) {
            const loaded = mobi.loadChapter(chapter.id);
            if (loaded?.html) content += loaded.html;
          }
          mobi.destroy();
        }

        if (!destroyed) {
          setHtml(content || "<p>Unable to extract MOBI content.</p>");
        }
      } catch (err) {
        if (!destroyed) {
          setError(
            err instanceof Error ? err.message : "Failed to parse MOBI file",
          );
        }
      }
    })();

    return () => {
      destroyed = true;
    };
  }, [bookId, file]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-fg-muted">
        <p>
          <span className="symbol">+ </span>
          {error}
        </p>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-fg-muted">
        <p className="label-caps">LOADING MOBI...</p>
      </div>
    );
  }

  return (
    <HtmlReader bookId={bookId} html={html} onProgress={onProgress} />
  );
}
