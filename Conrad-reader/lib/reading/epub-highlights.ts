import { addHighlight, getHighlights, removeHighlight } from "@/lib/db/index";
import type { HighlightRecord } from "@/lib/db/types";
import { nanoid } from "@/lib/util/nanoid";

export const EPUB_HIGHLIGHT_CLASS = "reader-epub-highlight";

export const EPUB_HIGHLIGHT_STYLES = {
  fill: "rgba(220, 200, 80, 0.45)",
  "fill-opacity": "0.45",
};

export type EpubSelection = {
  cfiRange: string;
  text: string;
};

function normalizeCfi(cfi: string): string {
  return cfi.replace(/\s+/g, "");
}

function findMatchingEpubHighlight(
  highlights: HighlightRecord[],
  cfiRange: string,
  text: string,
): HighlightRecord | null {
  const normCfi = normalizeCfi(cfiRange);
  const normText = text.trim();

  for (const item of highlights) {
    if (item.locator.type !== "epub" || !item.locator.cfi) continue;
    if (normalizeCfi(item.locator.cfi) === normCfi) return item;
    if (item.text.trim() === normText) return item;
  }
  return null;
}

export async function persistEpubHighlight(
  bookId: string,
  cfiRange: string,
  text: string,
): Promise<HighlightRecord> {
  const record: HighlightRecord = {
    id: nanoid(),
    bookId,
    text,
    color: "yellow",
    locator: { type: "epub", cfi: cfiRange },
    createdAt: Date.now(),
  };
  await addHighlight(record);
  return record;
}

export function paintEpubHighlight(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
  cfiRange: string,
  data?: Record<string, unknown>,
) {
  rendition?.annotations?.highlight(
    cfiRange,
    data ?? {},
    undefined,
    EPUB_HIGHLIGHT_CLASS,
    EPUB_HIGHLIGHT_STYLES,
  );
}

export function removeEpubHighlightAnnotation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
  cfiRange: string,
) {
  try {
    rendition?.annotations?.remove(cfiRange, "highlight");
  } catch {
    // section may have been unloaded
  }
}

function findLiveHighlightCfi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
  cfiRange: string,
  text: string,
): string | null {
  const store = rendition?.annotations?._annotations as
    | Record<
        string,
        { type?: string; cfiRange?: string; data?: { text?: string; id?: string } }
      >
    | undefined;
  if (!store) return null;

  const normCfi = normalizeCfi(cfiRange);
  const normText = text.trim();

  for (const ann of Object.values(store)) {
    if (ann?.type !== "highlight" || !ann.cfiRange) continue;
    if (normalizeCfi(ann.cfiRange) === normCfi) return ann.cfiRange;
    if (ann.data?.text?.trim() === normText) return ann.cfiRange;
  }
  return null;
}

export async function toggleEpubHighlight(
  bookId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
  cfiRange: string,
  text: string,
): Promise<"added" | "removed"> {
  const highlights = await getHighlights(bookId);
  let existing = findMatchingEpubHighlight(highlights, cfiRange, text);

  const liveCfi = findLiveHighlightCfi(rendition, cfiRange, text);
  if (!existing && liveCfi) {
    existing = findMatchingEpubHighlight(highlights, liveCfi, text);
  }

  const removeCfi = existing?.locator.type === "epub" ? existing.locator.cfi : liveCfi;

  if (removeCfi) {
    if (existing) await removeHighlight(existing.id);
    removeEpubHighlightAnnotation(rendition, removeCfi);
    if (normalizeCfi(removeCfi) !== normalizeCfi(cfiRange)) {
      removeEpubHighlightAnnotation(rendition, cfiRange);
    }
    return "removed";
  }

  const record = await persistEpubHighlight(bookId, cfiRange, text);
  paintEpubHighlight(rendition, cfiRange, { id: record.id, text });
  return "added";
}

export async function restoreEpubHighlights(
  bookId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
) {
  const items = await getHighlights(bookId);
  for (const item of items) {
    if (item.locator.type !== "epub" || !item.locator.cfi) continue;
    try {
      paintEpubHighlight(rendition, item.locator.cfi, {
        id: item.id,
        text: item.text,
      });
    } catch {
      // section may not be rendered yet
    }
  }
}
