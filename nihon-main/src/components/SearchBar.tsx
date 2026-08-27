"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import kanaData from "@/store/kana-data.json";
import kanjiData from "@/store/kanji-data.json";

interface SearchResult {
  type: "kana" | "kanji";
  char: string;
  romaji: string;
  meaning: string;
  context: string; // Shows where it matched (e.g., word or sentence)
  targetUrl: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Perform search
  const handleSearch = (val: string) => {
    setQuery(val);
    const q = val.toLowerCase().trim();
    if (!q) {
      setResults([]);
      return;
    }

    const matches: SearchResult[] = [];

    // 1. Search Kana
    const activeCells: Array<{ h: string; k: string; romaji: string }> = [
      ...(kanaData.grid.left as any[]).flatMap((r) => (r.cells as any[]).filter((c) => !c.empty)),
      ...(kanaData.grid.right as any[]).flatMap((r) => (r.cells as any[]).filter((c) => !c.empty)),
    ];
    const kanaDetails = kanaData.kanaDetails as Record<
      string,
      {
        h: { word: string; wordRomaji: string; wordMeaning: string; sentence: string; romaji: string; meaning: string };
        k: { word: string; wordRomaji: string; wordMeaning: string; sentence: string; romaji: string; meaning: string };
      }
    >;

    activeCells.forEach((cell) => {
      const details = kanaDetails[cell.romaji];

      const cellText = `${cell.h} ${cell.k} ${cell.romaji}`.toLowerCase();
      let context = "";
      let isMatch = cellText.includes(q);

      if (details) {
        // Search Hiragana details
        const hText = `${details.h.word} ${details.h.wordRomaji} ${details.h.wordMeaning} ${details.h.sentence} ${details.h.romaji} ${details.h.meaning}`.toLowerCase();
        if (hText.includes(q)) {
          isMatch = true;
          context = `Hiragana Vocab: ${details.h.word} ("${details.h.wordMeaning}")`;
        }

        // Search Katakana details
        const kText = `${details.k.word} ${details.k.wordRomaji} ${details.k.wordMeaning} ${details.k.sentence} ${details.k.romaji} ${details.k.meaning}`.toLowerCase();
        if (kText.includes(q)) {
          isMatch = true;
          context = `Katakana Vocab: ${details.k.word} ("${details.k.wordMeaning}")`;
        }
      }

      if (isMatch) {
        matches.push({
          type: "kana",
          char: `${cell.h} / ${cell.k}`,
          romaji: cell.romaji,
          meaning: details?.h.wordMeaning || "Kana character",
          context: context || "Kana grid match",
          targetUrl: `/kana?char=${cell.romaji}`,
        });
      }
    });

    // 2. Search Kanji
    const kanjiDetails = kanjiData.kanjiDetails as Record<
      string,
      {
        kanji: string;
        romaji: string;
        meaning: string;
        onyomi: string;
        kunyomi: string;
        onyomiExample: { sentence: string; romaji: string; meaning: string };
        kunyomiExample: { sentence: string; romaji: string; meaning: string };
      }
    >;

    Object.entries(kanjiDetails).forEach(([char, details]) => {
      const mainText = `${char} ${details.romaji} ${details.meaning} ${details.onyomi} ${details.kunyomi}`.toLowerCase();
      let isMatch = mainText.includes(q);
      let context = "";

      const onyomiText = `${details.onyomiExample?.sentence} ${details.onyomiExample?.romaji} ${details.onyomiExample?.meaning}`.toLowerCase();
      if (onyomiText.includes(q)) {
        isMatch = true;
        context = `Onyomi: ${details.onyomiExample.sentence} ("${details.onyomiExample.meaning}")`;
      }

      const kunyomiText = `${details.kunyomiExample?.sentence} ${details.kunyomiExample?.romaji} ${details.kunyomiExample?.meaning}`.toLowerCase();
      if (kunyomiText.includes(q)) {
        isMatch = true;
        context = `Kunyomi: ${details.kunyomiExample.sentence} ("${details.kunyomiExample.meaning}")`;
      }

      if (isMatch) {
        matches.push({
          type: "kanji",
          char: char,
          romaji: details.romaji,
          meaning: details.meaning,
          context: context || `Onyomi: ${details.onyomi} | Kunyomi: ${details.kunyomi}`,
          targetUrl: `/kanji?char=${char}`,
        });
      }
    });

    setResults(matches.slice(0, 10)); // Limit to top 10 matches
    setIsOpen(true);
  };

  const handleResultClick = (targetUrl: string) => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    router.push(targetUrl);
  };

  return (
    <div className="relative w-[280px] sm:w-[380px]" ref={dropdownRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => query && setIsOpen(true)}
        placeholder="SEARCH ROMAJI, MEANING, WORDS..."
        className="w-full bg-[#faf8f5] border border-[#e2dfd7] px-3 py-1.5 text-xs font-pixel tracking-wide rounded-none focus:outline-none focus:border-[#8c857b] placeholder-[#a8a196]"
      />

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#e2dfd7] shadow-lg z-50 max-h-[300px] overflow-y-auto rounded-none select-none">
          {results.map((res, index) => (
            <button
              key={`${res.type}-${res.char}-${index}`}
              onClick={() => handleResultClick(res.targetUrl)}
              className="w-full text-left p-2.5 hover:bg-[#faf8f5] border-b border-[#f2efe8] last:border-b-0 cursor-pointer block"
            >
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-[#1e1c1b]">{res.char}</span>
                <span className="text-[8px] font-pixel text-[#a8a196] uppercase tracking-wider bg-[#faf8f5] px-1.5 py-0.5 border border-[#e2dfd7]">
                  {res.type}
                </span>
              </div>
              <div className="text-xs text-[#2c2a29] mt-0.5">
                {res.romaji} - <span className="text-[#5e5850]">{res.meaning}</span>
              </div>
              {res.context && (
                <div className="text-[9px] text-[#7a756c] font-mono mt-1 opacity-80 truncate">
                  {res.context}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#e2dfd7] shadow-lg z-50 p-4 text-center rounded-none select-none">
          <span className="text-[9px] font-pixel text-[#a8a196] uppercase tracking-widest">
            No matches found
          </span>
        </div>
      )}
    </div>
  );
}
