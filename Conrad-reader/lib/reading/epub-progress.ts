/** Normalize epubjs percentage (0–1 or 0–100) to 0–100. */
export function normalizeEpubPercent(value: number | undefined | null): number {
  if (value == null || Number.isNaN(value) || value <= 0) return 0;
  return value <= 1 ? value * 100 : value;
}

/** Fallback when book.locations is not ready yet. */
export function chapterEstimatePercent(
  chapterIndex: number | undefined,
  spineLength: number,
): number {
  if (chapterIndex == null || chapterIndex < 0 || spineLength <= 0) return 0;
  return Math.min(99, ((chapterIndex + 0.25) / spineLength) * 100);
}

export type ProgressDetail = {
  bookPercent: number;
  chapterPercent: number;
  chapterIndex: number;
  chapterTotal: number;
};

/** Where the "reading line" sits in the viewport (upper third feels natural). */
const READING_LINE_RATIO = 0.35;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** Scroll position within a list of same-sized sections (PDF pages, HTML blocks). */
export function measureSectionProgress(
  scrollContainer: HTMLElement,
  sectionSelector: string,
): { chapterPercent: number; chapterIndex: number } {
  const sections = scrollContainer.querySelectorAll<HTMLElement>(sectionSelector);
  if (!sections.length) return { chapterPercent: 0, chapterIndex: 0 };

  const marker =
    scrollContainer.scrollTop + scrollContainer.clientHeight * READING_LINE_RATIO;

  let chapterIndex = 0;
  let chapterPercent = 0;

  for (let i = 0; i < sections.length; i++) {
    const el = sections[i];
    const top = el.offsetTop;
    const height = el.offsetHeight || 1;
    const bottom = top + height;

    if (marker < top) break;

    chapterIndex = i;
    if (marker >= bottom) {
      chapterPercent = 100;
    } else {
      chapterPercent = ((marker - top) / height) * 100;
      break;
    }
  }

  return {
    chapterIndex,
    chapterPercent: clampPercent(chapterPercent),
  };
}

/** EPUB continuous scroll — map loaded views back to spine chapter index. */
export function measureEpubChapterProgress(
  scrollContainer: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any,
): Pick<ProgressDetail, "chapterPercent" | "chapterIndex" | "chapterTotal"> {
  const views = rendition?.manager?.views?.all?.() ?? [];
  const chapterTotal =
    rendition?.book?.spine?.length ??
    rendition?.book?.spine?.spineItems?.length ??
    views.length;

  const fallbackIndex = rendition?.location?.start?.index ?? 0;

  if (!views.length || !scrollContainer) {
    return {
      chapterIndex: fallbackIndex,
      chapterPercent: 0,
      chapterTotal: chapterTotal || 1,
    };
  }

  const marker =
    scrollContainer.scrollTop + scrollContainer.clientHeight * READING_LINE_RATIO;

  let chapterIndex = fallbackIndex;
  let chapterPercent = 0;
  let matched = false;

  for (const view of views) {
    const el = view.element as HTMLElement | undefined;
    if (!el) continue;

    const top = el.offsetTop;
    const height = el.offsetHeight || 1;
    const bottom = top + height;

    if (marker < top) break;

    chapterIndex =
      typeof view.index === "number" ? view.index : chapterIndex;

    if (marker >= bottom) {
      chapterPercent = 100;
      matched = true;
    } else {
      chapterPercent = ((marker - top) / height) * 100;
      matched = true;
      break;
    }
  }

  if (!matched) {
    chapterIndex = fallbackIndex;
  }

  return {
    chapterIndex,
    chapterPercent: clampPercent(chapterPercent),
    chapterTotal: chapterTotal || 1,
  };
}

export function singleSectionProgress(bookPercent: number): ProgressDetail {
  return {
    bookPercent,
    chapterPercent: bookPercent,
    chapterIndex: 0,
    chapterTotal: 1,
  };
}

export function pagedProgress(
  pageIndex: number,
  pageTotal: number,
): ProgressDetail {
  const bookPercent = pageTotal > 0 ? ((pageIndex + 1) / pageTotal) * 100 : 0;
  return {
    bookPercent,
    chapterPercent: 100,
    chapterIndex: pageIndex,
    chapterTotal: pageTotal,
  };
}
