import { getAllBooks, getAllCollections, putCollection } from "@/lib/db/index";
import type { CollectionRecord } from "@/lib/db/types";

export const PILE_ID = "__pile__";
export const PILE_NAME = "THE PILE";

export function isPileCollection(col: CollectionRecord): boolean {
  return col.id === PILE_ID;
}

export async function ensurePileCollection(): Promise<CollectionRecord> {
  const collections = await getAllCollections();
  const existing = collections.find((c) => c.id === PILE_ID);
  if (existing) return existing;

  const pile: CollectionRecord = {
    id: PILE_ID,
    name: PILE_NAME,
    bookIds: [],
    createdAt: Date.now(),
  };
  await putCollection(pile);
  return pile;
}

export async function addBookToPile(bookId: string): Promise<void> {
  const pile = await ensurePileCollection();
  if (pile.bookIds.includes(bookId)) return;
  await putCollection({
    ...pile,
    bookIds: [...pile.bookIds, bookId],
  });
}

/** Books not assigned to any user shelf land in the pile. */
export async function syncOrphanBooksToPile(): Promise<void> {
  const [allBooks, collections] = await Promise.all([
    getAllBooks(),
    getAllCollections(),
  ]);
  const pile = await ensurePileCollection();
  const userShelves = collections.filter((c) => c.id !== PILE_ID);

  const pileIds = new Set(pile.bookIds);
  for (const book of allBooks) {
    const inUserShelf = userShelves.some((c) => c.bookIds.includes(book.id));
    if (!inUserShelf) pileIds.add(book.id);
  }

  const current = new Set(pile.bookIds);
  if (
    pileIds.size !== current.size ||
    [...pileIds].some((id) => !current.has(id))
  ) {
    await putCollection({ ...pile, bookIds: [...pileIds] });
  }
}

export function sortCollectionsForDisplay(
  collections: CollectionRecord[],
): CollectionRecord[] {
  const pile = collections.find((c) => c.id === PILE_ID);
  const rest = collections
    .filter((c) => c.id !== PILE_ID)
    .sort((a, b) => a.name.localeCompare(b.name));
  return pile ? [pile, ...rest] : rest;
}
