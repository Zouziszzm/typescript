export type WordLookupAnchor = {
  x: number;
  y: number;
};

export type DictionaryMeaning = {
  partOfSpeech: string;
  definitions: string[];
};

export type DictionaryResult = {
  word: string;
  phonetic?: string;
  meanings: DictionaryMeaning[];
  searchUrl: string;
};

type ApiDefinition = {
  definition?: string;
};

type ApiMeaning = {
  partOfSpeech?: string;
  definitions?: ApiDefinition[];
};

type ApiEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: ApiMeaning[];
};

export function dictionarySearchUrl(word: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`define ${word}`)}`;
}

export async function lookupWord(word: string): Promise<DictionaryResult> {
  const normalized = word.trim().toLowerCase();
  if (!normalized) {
    throw new Error("No word provided");
  }

  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`,
  );

  if (!res.ok) {
    throw new Error(res.status === 404 ? "Word not found" : "Lookup failed");
  }

  const entries = (await res.json()) as ApiEntry[];
  const entry = entries[0];
  if (!entry) {
    throw new Error("Word not found");
  }

  const phonetic =
    entry.phonetic ??
    entry.phonetics?.find((p) => p.text)?.text?.replace(/^\//, "").replace(/\/$/, "");

  const meanings: DictionaryMeaning[] = [];
  for (const meaning of entry.meanings ?? []) {
    const defs = (meaning.definitions ?? [])
      .map((d) => d.definition?.trim())
      .filter((d): d is string => Boolean(d))
      .slice(0, 3);
    if (!defs.length) continue;
    meanings.push({
      partOfSpeech: meaning.partOfSpeech ?? "definition",
      definitions: defs,
    });
    if (meanings.length >= 4) break;
  }

  if (!meanings.length) {
    throw new Error("No definition found");
  }

  return {
    word: entry.word ?? normalized,
    phonetic,
    meanings,
    searchUrl: dictionarySearchUrl(entry.word ?? normalized),
  };
}
