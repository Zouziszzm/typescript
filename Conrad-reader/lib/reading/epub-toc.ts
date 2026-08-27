export type TocItem = { label: string; href: string };

/** Compare EPUB chapter links by filename, ignoring path/hash/query differences. */
export function normalizeEpubHref(href: string | null | undefined): string {
  if (!href) return "";
  const withoutHash = href.split("#")[0]?.split("?")[0] ?? "";
  const parts = withoutHash.split("/").filter(Boolean);
  const basename = parts[parts.length - 1] ?? withoutHash;
  try {
    return decodeURIComponent(basename).toLowerCase();
  } catch {
    return basename.toLowerCase();
  }
}

export function findTocIndexByHref(
  toc: TocItem[],
  href: string | null | undefined,
): number {
  if (!href || toc.length === 0) return -1;

  const normalized = normalizeEpubHref(href);
  const lowerHref = href.toLowerCase();

  for (let i = 0; i < toc.length; i++) {
    const item = toc[i];
    if (item.href === href) return i;
    const itemLower = item.href.toLowerCase();
    if (lowerHref.endsWith(itemLower) || itemLower.endsWith(lowerHref)) {
      return i;
    }
  }

  if (normalized) {
    for (let i = 0; i < toc.length; i++) {
      if (normalizeEpubHref(toc[i].href) === normalized) return i;
    }
  }

  return -1;
}

export function chapterNumberFromLabel(label: string | undefined): number | null {
  const match = label?.match(/\bchapter\s+(\d+)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function tocChapterTotal(toc: TocItem[]): number {
  if (toc.length === 0) return 1;
  const numbered = toc
    .map((item) => chapterNumberFromLabel(item.label))
    .filter((value): value is number => value != null);
  return numbered.length > 0 ? Math.max(...numbered) : toc.length;
}

export function tocChapterDisplayIndex(
  toc: TocItem[],
  tocIndex: number,
): number {
  if (tocIndex < 0 || tocIndex >= toc.length) return 0;
  const fromLabel = chapterNumberFromLabel(toc[tocIndex]?.label);
  return fromLabel != null ? fromLabel - 1 : tocIndex;
}
