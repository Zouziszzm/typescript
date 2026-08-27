import { getBook, putProgress } from "@/lib/db/index";
import type { ProgressLocator, ProgressRecord } from "@/lib/db/types";

export async function saveProgress(
  bookId: string,
  locator: ProgressLocator,
  percent: number,
): Promise<void> {
  const book = await getBook(bookId);
  if (!book) return;

  const record: ProgressRecord = {
    bookId,
    locator,
    percent: Math.min(100, Math.max(0, Math.round(percent))),
    updatedAt: Date.now(),
  };
  await putProgress(record);
}

type PendingSave = {
  locator: ProgressLocator;
  percent: number;
  timer: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingSave>();

/** Batches rapid scroll updates into occasional IndexedDB writes. */
export function saveProgressDebounced(
  bookId: string,
  locator: ProgressLocator,
  percent: number,
  delayMs = 1500,
): void {
  const existing = pending.get(bookId);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    pending.delete(bookId);
    void saveProgress(bookId, locator, percent);
  }, delayMs);

  pending.set(bookId, { locator, percent, timer });
}

export function cancelProgressSave(bookId?: string): void {
  if (bookId) {
    const entry = pending.get(bookId);
    if (entry) clearTimeout(entry.timer);
    pending.delete(bookId);
    return;
  }

  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
  }
  pending.clear();
}

export function flushProgressSave(bookId?: string): void {
  const entries = bookId
    ? pending.has(bookId)
      ? [[bookId, pending.get(bookId)!] as const]
      : []
    : [...pending.entries()];

  for (const [id, entry] of entries) {
    clearTimeout(entry.timer);
    pending.delete(id);
    void saveProgress(id, entry.locator, entry.percent);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => flushProgressSave());
}
