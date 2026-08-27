import type { ReadingMode } from "@/lib/theme";

export type BookFormat = "epub" | "pdf" | "txt" | "mobi";

export type BookRecord = {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  fileName: string;
  fileSize: number;
  coverDataUrl?: string;
  contentKey?: string;
  addedAt: number;
  lastOpenedAt?: number;
  wordCount?: number;
};

export type ProgressLocator =
  | { type: "epub"; cfi: string }
  | { type: "txt"; offset: number }
  | { type: "pdf"; page: number }
  | { type: "mobi"; chapterId: string; offset: number };

export type ProgressRecord = {
  bookId: string;
  locator: ProgressLocator;
  percent: number;
  updatedAt: number;
};

export type SessionStats = {
  id: string;
  date: string;
  minutes: number;
};

export type BookmarkRecord = {
  id: string;
  bookId: string;
  label: string;
  locator: ProgressLocator;
  createdAt: number;
};

export type HighlightRecord = {
  id: string;
  bookId: string;
  text: string;
  note?: string;
  color: string;
  locator: ProgressLocator | { type: "text"; start: number; end: number };
  createdAt: number;
};

export type CollectionRecord = {
  id: string;
  name: string;
  bookIds: string[];
  createdAt: number;
};

export type BookSettingsRecord = {
  bookId: string;
  readingMode?: ReadingMode;
};

export type SortKey = "title" | "author" | "added" | "progress";
