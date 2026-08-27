export interface SentenceExample {
  sentence: string;
  romaji: string;
  meaning: string;
}

export interface KanjiItem {
  kanji: string;
  romaji: string;
  meaning: string;
  onyomi: string;
  kunyomi: string;
  onyomiExample: SentenceExample;
  kunyomiExample: SentenceExample;
}

export interface KanjiTier {
  id: string;
  name: string;
  active: boolean;
}
