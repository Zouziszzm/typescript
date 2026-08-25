import english from "../../public/texts/english.json";
import quotes from "../../public/texts/quotes.json";
import { tokenizeText, type GameMode } from "@key-warriors/shared";

export function generateWords(count: number): string[] {
  const pool = english as string[];
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(pool[Math.floor(Math.random() * pool.length)]!);
  }
  return words;
}

export function pickQuote(): string {
  const list = quotes as Array<{ text: string; source: string }>;
  const q = list[Math.floor(Math.random() * list.length)]!;
  return q.text;
}

export function buildSourceText(
  mode: GameMode,
  modeValue: number | null,
  customText?: string | null
): string {
  if (mode === "custom" && customText?.trim()) {
    return customText.trim();
  }
  if (mode === "quote") {
    return pickQuote();
  }
  if (mode === "time") {
    // Enough words for the duration at ~60 WPM
    const seconds = modeValue ?? 60;
    const wordCount = Math.max(50, Math.ceil((seconds / 60) * 80));
    return generateWords(wordCount).join(" ");
  }
  // words mode
  const count = modeValue ?? 25;
  return generateWords(count).join(" ");
}

export function buildWordsFromSettings(
  mode: GameMode,
  modeValue: number | null,
  customText?: string | null
): { sourceText: string; words: string[] } {
  const sourceText = buildSourceText(mode, modeValue, customText);
  return { sourceText, words: tokenizeText(sourceText) };
}
