"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "@/lib/util/nanoid";
import {
  getAllBooks,
  getAllCollections,
  getAllProgress,
  getAllStats,
  getTodayStats,
  putCollection,
} from "@/lib/db/index";
import type {
  BookRecord,
  CollectionRecord,
  ProgressRecord,
  SortKey,
} from "@/lib/db/types";
import { deleteBookFromLibrary } from "@/lib/library/delete-book";
import {
  PILE_ID,
  sortCollectionsForDisplay,
  syncOrphanBooksToPile,
  ensurePileCollection,
} from "@/lib/library/collections";
import { importBooks } from "@/lib/import/import-book";
import { getReadingStreak } from "@/lib/stats/reading";
import { withTimeout } from "@/lib/util/with-timeout";

function filterBooksForCollection(
  books: BookRecord[],
  collections: CollectionRecord[],
  activeCollection: string | null,
): BookRecord[] {
  if (!activeCollection) return books;

  if (activeCollection === PILE_ID) {
    const pile = collections.find((c) => c.id === PILE_ID);
    const userShelves = collections.filter((c) => c.id !== PILE_ID);

    return books.filter((book) => {
      if (pile?.bookIds.includes(book.id)) return true;
      return !userShelves.some((shelf) => shelf.bookIds.includes(book.id));
    });
  }

  const col = collections.find((c) => c.id === activeCollection);
  if (!col) return books;
  return books.filter((b) => col.bookIds.includes(b.id));
}

function sortBooks(
  books: BookRecord[],
  progressMap: Record<string, ProgressRecord>,
  sort: SortKey,
): BookRecord[] {
  const copy = [...books];
  switch (sort) {
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "author":
      return copy.sort((a, b) => a.author.localeCompare(b.author));
    case "progress":
      return copy.sort(
        (a, b) =>
          (progressMap[b.id]?.percent ?? 0) - (progressMap[a.id]?.percent ?? 0),
      );
    default:
      return copy.sort((a, b) => b.addedAt - a.addedAt);
  }
}

export function useLibrary() {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [progressMap, setProgressMap] = useState<
    Record<string, ProgressRecord>
  >({});
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("added");
  const [activeCollection, setActiveCollection] = useState<string | null>(PILE_ID);
  const refreshQueue = useRef(Promise.resolve());

  const refresh = useCallback(async (options?: { syncPile?: boolean }) => {
    const run = async () => {
      try {
        const [allBooks, minutes, stats, allProgress] = await withTimeout(
          Promise.all([
            getAllBooks(),
            getTodayStats(),
            getAllStats(),
            getAllProgress(),
          ]),
          15000,
          "Library load timed out. Try refreshing the page.",
        );

        if (options?.syncPile) {
          await withTimeout(
            syncOrphanBooksToPile(),
            10000,
            "Could not sync collections",
          );
        } else {
          await withTimeout(
            ensurePileCollection(),
            5000,
            "Could not load collections",
          );
        }

        const collectionsAfterSync = await getAllCollections();

        setBooks(allBooks);
        setProgressMap(
          Object.fromEntries(allProgress.map((p) => [p.bookId, p])),
        );
        setTodayMinutes(minutes);
        setStreak(getReadingStreak(stats));
        setCollections(sortCollectionsForDisplay(collectionsAfterSync));
        setLoadError(null);
        setLoading(false);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load library",
        );
        setLoading(false);
      }
    };

    refreshQueue.current = refreshQueue.current.then(run, run);
    await refreshQueue.current;
  }, []);

  useEffect(() => {
    const safetyTimer = window.setTimeout(() => {
      setLoading((current) => {
        if (current) {
          setLoadError(
            "Library is taking too long to load. Try closing other tabs, then refresh.",
          );
          return false;
        }
        return current;
      });
    }, 12000);

    void refresh({ syncPile: true });

    return () => window.clearTimeout(safetyTimer);
  }, [refresh]);

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileList = Array.from(files);
      if (!fileList.length) return;
      setImporting(true);
      setImportError(null);
      setImportNotice(null);
      try {
        const { imported, failed } = await withTimeout(
          importBooks(fileList),
          120000,
          "Import timed out. The file may be too large for this device.",
        );
        if (imported.length > 0) {
          setBooks((prev) => {
            const importedIds = new Set(imported.map((book) => book.id));
            return [
              ...imported,
              ...prev.filter((book) => !importedIds.has(book.id)),
            ];
          });
          setCollections((prev) =>
            sortCollectionsForDisplay(
              prev.map((col) =>
                col.id === PILE_ID
                  ? {
                      ...col,
                      bookIds: [
                        ...new Set([
                          ...col.bookIds,
                          ...imported.map((book) => book.id),
                        ]),
                      ],
                    }
                  : col,
              ),
            ),
          );
          setImportNotice(
            imported.length === 1
              ? `Added “${imported[0].title}”`
              : `Added ${imported.length} books`,
          );
        }
        void refresh({ syncPile: true });
        if (failed.length > 0) {
          const msg = failed
            .map((f) => `${f.fileName}: ${f.error}`)
            .join("\n");
          setImportError(
            imported.length > 0
              ? `Imported ${imported.length}. Failed:\n${msg}`
              : msg,
          );
        }
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : "Import failed",
        );
      } finally {
        setImporting(false);
      }
    },
    [refresh],
  );

  const removeBook = useCallback(
    async (id: string) => {
      await deleteBookFromLibrary(id);
      await refresh({ syncPile: true });
    },
    [refresh],
  );

  const filteredBooks = useMemo(() => {
    let list = sortBooks(books, progressMap, sort);

    list = filterBooksForCollection(list, collections, activeCollection);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q),
      );
    }

    return list;
  }, [books, progressMap, sort, search, activeCollection, collections]);

  const inProgress = books.filter((b) => {
    const p = progressMap[b.id];
    return p && p.percent > 0 && p.percent < 100;
  });

  const addToCollection = useCallback(
    async (bookId: string, colId: string) => {
      const col = collections.find((c) => c.id === colId);
      if (!col || col.bookIds.includes(bookId)) return;
      await putCollection({
        ...col,
        bookIds: [...col.bookIds, bookId],
      });
      await refresh({ syncPile: true });
    },
    [collections, refresh],
  );

  const createCollection = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      await putCollection({
        id: nanoid(),
        name: trimmed.toUpperCase(),
        bookIds: [],
        createdAt: Date.now(),
      });
      await refresh({ syncPile: false });
    },
    [refresh],
  );

  return {
    books: filteredBooks,
    allBooks: books,
    collections,
    progressMap,
    todayMinutes,
    streak,
    loading,
    loadError,
    importing,
    importError,
    importNotice,
    inProgress,
    search,
    setSearch,
    sort,
    setSort,
    activeCollection,
    setActiveCollection,
    importFiles,
    removeBook,
    addToCollection,
    createCollection,
    refresh,
  };
}
