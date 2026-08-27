import { initKf8File, initMobiFile } from "@lingo-reader/mobi-parser";
import type { BookFormat } from "@/lib/db/types";

export type ParsedMetadata = {
  title: string;
  author: string;
  coverDataUrl?: string;
};

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

export function detectFormat(
  fileName: string,
  mimeType = "",
): BookFormat | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "epub") return "epub";
  if (ext === "pdf") return "pdf";
  if (ext === "txt") return "txt";
  if (ext === "mobi" || ext === "azw" || ext === "azw3") return "mobi";

  const mime = mimeType.toLowerCase();
  if (mime.includes("epub") || mime === "application/epub+zip") return "epub";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/")) return "txt";
  if (
    mime.includes("mobipocket") ||
    mime.includes("mobi") ||
    mime.includes("x-mobipocket")
  ) {
    return "mobi";
  }

  return null;
}

export async function parseMetadata(
  file: File,
  format: BookFormat,
): Promise<ParsedMetadata> {
  switch (format) {
    case "txt":
      return {
        title: titleFromFileName(file.name),
        author: "Unknown",
      };

    case "epub":
      return parseEpubMetadata(file);

    case "pdf":
      return parsePdfMetadata(file);

    case "mobi":
      return parseMobiMetadata(file);
  }
}

async function parseEpubMetadata(file: File): Promise<ParsedMetadata> {
  try {
    const ePub = (await import("epubjs")).default;
    const book = ePub(await file.arrayBuffer());
    // Must await opened, not ready — ready resolves before CSS replacement finishes
    await book.opened;

    const metadata = await book.loaded.metadata;
    let coverDataUrl: string | undefined;

    try {
      const coverUrl = await book.coverUrl();
      if (coverUrl) {
        const res = await fetch(coverUrl);
        const blob = await res.blob();
        coverDataUrl = await blobToDataUrl(blob);
      }
    } catch {
      // no cover
    }

    book.destroy();

    return {
      title: metadata.title || titleFromFileName(file.name),
      author: metadata.creator || "Unknown",
      coverDataUrl,
    };
  } catch {
    return {
      title: titleFromFileName(file.name),
      author: "Unknown",
    };
  }
}

import { loadPdfJs } from "@/lib/pdf/setup-pdfjs";

async function parsePdfMetadata(file: File): Promise<ParsedMetadata> {
  const fallback = {
    title: titleFromFileName(file.name),
    author: "Unknown",
  };

  try {
    const pdfjs = await loadPdfJs();
    const data = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data }).promise;

    let title = fallback.title;
    let author = fallback.author;

    try {
      const meta = await doc.getMetadata();
      const info = meta?.info as Record<string, string> | undefined;
      title = info?.Title?.trim() || title;
      author = info?.Author?.trim() || author;
    } catch {
      // Metadata is optional — filename fallback is fine.
    }

    await doc.cleanup().catch(() => undefined);
    return { title, author };
  } catch {
    return fallback;
  }
}

async function parseMobiMetadata(file: File): Promise<ParsedMetadata> {
  try {
    const kf8 = await initKf8File(file);
    const metadata = kf8.getMetadata();
    let coverDataUrl: string | undefined;

    try {
      const cover = kf8.getCoverImage();
      if (cover) coverDataUrl = cover;
    } catch {
      // no cover
    }

    kf8.destroy();

    return {
      title: metadata.title || titleFromFileName(file.name),
      author: metadata.author?.[0] || "Unknown",
      coverDataUrl,
    };
  } catch {
    const mobi = await initMobiFile(file);
    const metadata = mobi.getMetadata();
    let coverDataUrl: string | undefined;

    try {
      const cover = mobi.getCoverImage();
      if (cover) coverDataUrl = cover;
    } catch {
      // no cover
    }

    mobi.destroy();

    return {
      title: metadata.title || titleFromFileName(file.name),
      author: metadata.author?.[0] || "Unknown",
      coverDataUrl,
    };
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
