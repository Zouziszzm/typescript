import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  BookRecord,
  BookSettingsRecord,
  BookmarkRecord,
  CollectionRecord,
  HighlightRecord,
  ProgressRecord,
  SessionStats,
} from "./types";

interface ReaderDB extends DBSchema {
  books: {
    key: string;
    value: BookRecord;
    indexes: { "by-added": number; "by-title": string };
  };
  progress: { key: string; value: ProgressRecord };
  fileBlobs: { key: string; value: Blob | { data: ArrayBuffer; type: string } };
  stats: { key: string; value: SessionStats };
  bookmarks: {
    key: string;
    value: BookmarkRecord;
    indexes: { "by-book": string };
  };
  highlights: {
    key: string;
    value: HighlightRecord;
    indexes: { "by-book": string };
  };
  collections: { key: string; value: CollectionRecord };
  bookSettings: { key: string; value: BookSettingsRecord };
}

const DB_NAME = "reader-db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<ReaderDB>> | null = null;

function resetDbConnection() {
  dbPromise = null;
}

export function getDb() {
  if (!dbPromise) {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Server-side execution"));
    }
    if (!window.indexedDB) {
      dbPromise = Promise.reject(new Error("IndexedDB is not supported in this browser."));
      return dbPromise;
    }

    const openPromise = openDB<ReaderDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const books = db.createObjectStore("books", { keyPath: "id" });
          books.createIndex("by-added", "addedAt");
          books.createIndex("by-title", "title");
          db.createObjectStore("progress", { keyPath: "bookId" });
          db.createObjectStore("fileBlobs");
          db.createObjectStore("stats", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          const bookmarks = db.createObjectStore("bookmarks", {
            keyPath: "id",
          });
          bookmarks.createIndex("by-book", "bookId");
          const highlights = db.createObjectStore("highlights", {
            keyPath: "id",
          });
          highlights.createIndex("by-book", "bookId");
          db.createObjectStore("collections", { keyPath: "id" });
          db.createObjectStore("bookSettings", { keyPath: "bookId" });
        }
      },
      blocked() {
        resetDbConnection();
      },
      blocking() {
        resetDbConnection();
      },
    });

    dbPromise = new Promise<IDBPDatabase<ReaderDB>>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(
          new Error(
            "Database initialization timed out. Your browser may restrict storage access (e.g. in private browsing or insecure HTTP)."
          )
        );
      }, 3000);

      openPromise.then(
        (db) => {
          window.clearTimeout(timer);
          resolve(db);
        },
        (err) => {
          window.clearTimeout(timer);
          resetDbConnection();
          reject(err);
        }
      );
    });
  }
  return dbPromise;
}

export async function getAllBooks(): Promise<BookRecord[]> {
  const db = await getDb();
  return db.getAll("books");
}

export async function getBook(id: string): Promise<BookRecord | undefined> {
  const db = await getDb();
  return db.get("books", id);
}

export async function putBook(book: BookRecord): Promise<void> {
  const db = await getDb();
  await db.put("books", book);
}

export async function removeBookCompletely(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("books", id);
  await db.delete("progress", id);
  await db.delete("fileBlobs", id);
  await db.delete("bookSettings", id);

  const bookmarks = await db.getAllFromIndex("bookmarks", "by-book", id);
  for (const b of bookmarks) await db.delete("bookmarks", b.id);

  const highlights = await db.getAllFromIndex("highlights", "by-book", id);
  for (const h of highlights) await db.delete("highlights", h.id);

  const collections = await db.getAll("collections");
  for (const col of collections) {
    if (col.bookIds.includes(id)) {
      await db.put("collections", {
        ...col,
        bookIds: col.bookIds.filter((bid) => bid !== id),
      });
    }
  }

  await cleanupOrphanedBookData();
}

/** Removes reading data whose book record no longer exists. */
export async function cleanupOrphanedBookData(): Promise<void> {
  const db = await getDb();
  const books = await db.getAll("books");
  const validIds = new Set(books.map((b) => b.id));

  for (const progress of await db.getAll("progress")) {
    if (!validIds.has(progress.bookId)) {
      await db.delete("progress", progress.bookId);
    }
  }

  for (const bookmark of await db.getAll("bookmarks")) {
    if (!validIds.has(bookmark.bookId)) {
      await db.delete("bookmarks", bookmark.id);
    }
  }

  for (const highlight of await db.getAll("highlights")) {
    if (!validIds.has(highlight.bookId)) {
      await db.delete("highlights", highlight.id);
    }
  }

  for (const settings of await db.getAll("bookSettings")) {
    if (!validIds.has(settings.bookId)) {
      await db.delete("bookSettings", settings.bookId);
    }
  }
}

export async function getProgress(
  bookId: string,
): Promise<ProgressRecord | undefined> {
  const db = await getDb();
  return db.get("progress", bookId);
}

export async function getAllProgress(): Promise<ProgressRecord[]> {
  const db = await getDb();
  return db.getAll("progress");
}

export async function putProgress(progress: ProgressRecord): Promise<void> {
  const db = await getDb();
  await db.put("progress", progress);
}

export async function getAllStats(): Promise<SessionStats[]> {
  const db = await getDb();
  return db.getAll("stats");
}

export async function getTodayStats(): Promise<number> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  return (await db.get("stats", today))?.minutes ?? 0;
}

export async function addReadingMinutes(minutes: number): Promise<void> {
  if (minutes <= 0) return;
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.get("stats", today);
  await db.put("stats", {
    id: today,
    date: today,
    minutes: (existing?.minutes ?? 0) + minutes,
  });
}

export async function touchBookOpened(id: string): Promise<void> {
  const book = await getBook(id);
  if (!book) return;
  await putBook({ ...book, lastOpenedAt: Date.now() });
}

export async function getBookmarks(bookId: string): Promise<BookmarkRecord[]> {
  const db = await getDb();
  const items = await db.getAllFromIndex("bookmarks", "by-book", bookId);
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addBookmark(
  bookmark: BookmarkRecord,
): Promise<void> {
  const db = await getDb();
  await db.put("bookmarks", bookmark);
}

export async function removeBookmark(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("bookmarks", id);
}

export async function getHighlights(bookId: string): Promise<HighlightRecord[]> {
  const db = await getDb();
  const items = await db.getAllFromIndex("highlights", "by-book", bookId);
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addHighlight(highlight: HighlightRecord): Promise<void> {
  const db = await getDb();
  await db.put("highlights", highlight);
}

export async function removeHighlight(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("highlights", id);
}

export async function getAllCollections(): Promise<CollectionRecord[]> {
  const db = await getDb();
  return db.getAll("collections");
}

export async function putCollection(col: CollectionRecord): Promise<void> {
  const db = await getDb();
  await db.put("collections", col);
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("collections", id);
}

export async function getBookSettings(
  bookId: string,
): Promise<BookSettingsRecord | undefined> {
  const db = await getDb();
  return db.get("bookSettings", bookId);
}

export async function putBookSettings(
  settings: BookSettingsRecord,
): Promise<void> {
  const db = await getDb();
  await db.put("bookSettings", settings);
}

export async function exportAllData(): Promise<string> {
  const db = await getDb();
  const [books, progress, bookmarks, highlights, collections, stats] =
    await Promise.all([
      db.getAll("books"),
      db.getAll("progress"),
      db.getAll("bookmarks"),
      db.getAll("highlights"),
      db.getAll("collections"),
      db.getAll("stats"),
    ]);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      books,
      progress,
      bookmarks,
      highlights,
      collections,
      stats,
    },
    null,
    2,
  );
}
