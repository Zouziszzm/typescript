export interface KanaCell {
  h: string;     // Hiragana character
  k: string;     // Katakana character
  romaji: string;
  empty?: boolean;
}

export interface KanaRow {
  label: string;
  cells: KanaCell[];
}
