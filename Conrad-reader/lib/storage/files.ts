import { getDb } from "@/lib/db/index";

const BOOKS_DIR = "books";
const OPFS_TIMEOUT_MS = 5000;

function withStorageTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error("Storage operation timed out"));
    }, OPFS_TIMEOUT_MS);

    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function supportsOpfs(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "storage" in navigator &&
    "getDirectory" in navigator.storage
  );
}

async function getBooksDirectory() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(BOOKS_DIR, { create: true });
}

export async function storeBookFile(bookId: string, file: File): Promise<void> {
  if (supportsOpfs()) {
    try {
      await withStorageTimeout(
        (async () => {
          const dir = await getBooksDirectory();
          const handle = await dir.getFileHandle(bookId, { create: true });
          const writable = await handle.createWritable();
          const data = await file.arrayBuffer();
          await writable.write(data);
          await writable.close();
        })(),
      );
      return;
    } catch {
      // OPFS unavailable — fall back to IndexedDB.
    }
  }

  const db = await getDb();
  const arrayBuffer = await file.arrayBuffer();
  await db.put(
    "fileBlobs",
    { data: arrayBuffer, type: file.type || "application/octet-stream" },
    bookId,
  );
}

export async function getBookFile(bookId: string): Promise<Blob | null> {
  if (supportsOpfs()) {
    try {
      const dir = await getBooksDirectory();
      const handle = await dir.getFileHandle(bookId);
      return handle.getFile();
    } catch {
      // try IndexedDB below
    }
  }

  const db = await getDb();
  const raw = await db.get("fileBlobs", bookId);
  if (!raw) return null;
  if (raw instanceof Blob) {
    return raw;
  }
  if (raw && typeof raw === "object" && "data" in raw && "type" in raw) {
    return new Blob([raw.data], { type: raw.type });
  }
  return null;
}

export async function deleteBookFile(bookId: string): Promise<void> {
  if (supportsOpfs()) {
    try {
      const dir = await getBooksDirectory();
      await dir.removeEntry(bookId);
    } catch {
      // file may not exist
    }
  }

  const db = await getDb();
  await db.delete("fileBlobs", bookId);
}
