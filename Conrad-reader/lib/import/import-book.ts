import { nanoid } from "@/lib/util/nanoid";
import { putBook } from "@/lib/db/index";
import type { BookRecord } from "@/lib/db/types";
import { addBookToPile } from "@/lib/library/collections";
import { storeBookFile } from "@/lib/storage/files";
import { detectFormat, parseMetadata } from "./metadata";

async function hashFileContent(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fallbackContentKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export type ImportResult = {
  imported: BookRecord[];
  failed: { fileName: string; error: string }[];
};

export async function importBook(file: File): Promise<BookRecord> {
  const format = detectFormat(file.name, file.type);
  if (!format) {
    throw new Error(
      `Unsupported file type: ${file.name || "unknown"}${file.type ? ` (${file.type})` : ""}`,
    );
  }

  const metadata = await parseMetadata(file, format);
  let contentKey = fallbackContentKey(file);
  try {
    contentKey = await hashFileContent(file);
  } catch {
    // Large files can fail hashing — still import with a stable fallback key.
  }
  const id = nanoid();

  await storeBookFile(id, file);

  const book: BookRecord = {
    id,
    title: metadata.title,
    author: metadata.author,
    format,
    fileName: file.name,
    fileSize: file.size,
    coverDataUrl: metadata.coverDataUrl,
    contentKey,
    addedAt: Date.now(),
  };

  await putBook(book);
  await addBookToPile(id);
  return book;
}

export async function importBooks(
  files: FileList | File[],
): Promise<ImportResult> {
  const list = Array.from(files);
  const imported: BookRecord[] = [];
  const failed: { fileName: string; error: string }[] = [];

  for (const file of list) {
    try {
      const book = await importBook(file);
      imported.push(book);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      console.error(`Failed to import ${file.name}:`, err);
      failed.push({ fileName: file.name, error: message });
    }
  }

  return { imported, failed };
}
