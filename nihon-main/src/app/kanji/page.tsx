"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import kanjiDb from "@/store/kanji-data.json";
import KanjiGrid from "@/components/KanjiGrid";
import KanjiPreviewCard from "@/components/KanjiPreviewCard";

function KanjiPageContent() {
  const searchParams = useSearchParams();
  const [activeTier, setActiveTier] = useState("all");
  const [currentKanji, setCurrentKanji] = useState("");
  const [remembered, setRemembered] = useState<string[]>([]);
  const [showRememberedSection, setShowRememberedSection] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Load remembered list from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("remembered_kanji");
    if (saved) {
      try {
        setRemembered(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const allKanjis = activeTier === "all"
    ? Object.values(kanjiDb.grid).flat()
    : (kanjiDb.grid as Record<string, string[]>)[activeTier] || [];
  const visibleKanjis = allKanjis.filter((char) => !remembered.includes(char));

  // Sync selection with URL query parameter ?char=...
  useEffect(() => {
    const char = searchParams.get("char");
    if (char && allKanjis.includes(char)) {
      // If it is in remembered, restore it
      if (remembered.includes(char)) {
        const updated = remembered.filter((c) => c !== char);
        setRemembered(updated);
        localStorage.setItem("remembered_kanji", JSON.stringify(updated));
      }
      
      setCurrentKanji(char);
      
      // Calculate which page the character is on
      const visibleIdx = allKanjis.filter((c) => c === char || !remembered.includes(c)).indexOf(char);
      if (visibleIdx !== -1) {
        const targetPage = Math.floor(visibleIdx / 50) + 1;
        setCurrentPage(targetPage);
      }
    }
  }, [searchParams, allKanjis, remembered]);

  // Initialize current kanji once data loads
  useEffect(() => {
    if (visibleKanjis.length > 0 && !visibleKanjis.includes(currentKanji)) {
      setCurrentKanji(visibleKanjis[0]);
    }
  }, [activeTier, remembered]);

  // Adjust page number if it exceeds new bounds
  const totalPages = Math.ceil(visibleKanjis.length / 50) || 1;
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [visibleKanjis.length, totalPages]);

  const handlePrev = () => {
    if (visibleKanjis.length === 0) return;
    const idx = visibleKanjis.indexOf(currentKanji);
    const prevIdx = idx <= 0 ? visibleKanjis.length - 1 : idx - 1;
    setCurrentKanji(visibleKanjis[prevIdx]);
  };

  const handleNext = () => {
    if (visibleKanjis.length === 0) return;
    const idx = visibleKanjis.indexOf(currentKanji);
    const nextIdx = idx >= visibleKanjis.length - 1 ? 0 : idx + 1;
    setCurrentKanji(visibleKanjis[nextIdx]);
  };

  const handleKanjiClick = (char: string) => {
    setCurrentKanji(char);
  };

  const handleTierChange = (tierId: string) => {
    setActiveTier(tierId);
    setCurrentPage(1);
    const newKanjis = tierId === "all"
      ? Object.values(kanjiDb.grid).flat()
      : (kanjiDb.grid as Record<string, string[]>)[tierId] || [];
    const newVisible = newKanjis.filter((char) => !remembered.includes(char));
    setCurrentKanji(newVisible[0] || "");
  };

  const handleRemember = (char: string) => {
    const updated = [...remembered, char];
    setRemembered(updated);
    localStorage.setItem("remembered_kanji", JSON.stringify(updated));

    // Find next kanji to select automatically
    const idx = visibleKanjis.indexOf(char);
    if (visibleKanjis.length > 1) {
      const nextSelect = visibleKanjis[idx === visibleKanjis.length - 1 ? idx - 1 : idx + 1];
      setCurrentKanji(nextSelect);
    } else {
      setCurrentKanji("");
    }
  };

  const handleForget = (char: string) => {
    const updated = remembered.filter((c) => c !== char);
    setRemembered(updated);
    localStorage.setItem("remembered_kanji", JSON.stringify(updated));
    if (!currentKanji) {
      setCurrentKanji(char);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 py-4 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] pb-24 rounded-none">
      {/* Upper Grid Section */}
      <KanjiGrid
        currentKanji={currentKanji}
        onKanjiClick={handleKanjiClick}
        activeTier={activeTier}
        onTierChange={handleTierChange}
        visibleKanjis={visibleKanjis}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Remember Toggle & Section */}
      <div className="w-full max-w-[820px] mt-3 select-none flex flex-col items-center">
        <button
          onClick={() => setShowRememberedSection(!showRememberedSection)}
          className="text-[9px] font-pixel text-[#7a756c] hover:text-[#1e1c1b] border border-[#e2dfd7] px-3 py-1 bg-white cursor-pointer rounded-none active:bg-[#efece3] tracking-widest uppercase font-bold"
        >
          {showRememberedSection ? "Hide Remembered" : "Show Remembered"} ({remembered.length})
        </button>

        {showRememberedSection && (
          <div className="w-full bg-[#fcfbf9] border border-[#e2dfd7] p-3 mt-2 flex flex-wrap gap-2 justify-center rounded-none shadow-inner max-h-[120px] overflow-y-auto">
            {remembered.length === 0 ? (
              <span className="text-[9px] font-pixel text-[#a8a196] py-4 uppercase tracking-widest">
                No Kanjis remembered yet
              </span>
            ) : (
              remembered.map((char) => {
                const strokeSvgs = kanjiDb.strokeSvgs as Record<string, string>;
                const svgText = strokeSvgs[char] || "";
                return (
                  <button
                    key={char}
                    onClick={() => handleForget(char)}
                    title="Click to Forget"
                    className="w-9 h-9 border border-[#e2dfd7] bg-white hover:border-red-400 flex items-center justify-center cursor-pointer rounded-none relative group"
                  >
                    {svgText ? (
                      <div
                        className="w-6 h-6 pointer-events-none [&_svg]:w-full [&_svg]:h-full [&_svg_path]:stroke-[#7a756c] [&_svg_path]:stroke-[6px] [&_svg_text]:hidden group-hover:[&_svg_path]:stroke-red-400"
                        dangerouslySetInnerHTML={{ __html: svgText }}
                      />
                    ) : (
                      <span className="text-sm text-[#7a756c] group-hover:text-red-400">{char}</span>
                    )}
                    <span className="absolute -top-1 -right-1 text-[7px] text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-white px-0.5 border border-red-200">
                      ×
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Preview Area */}
      {currentKanji && (
        <KanjiPreviewCard
          currentKanji={currentKanji}
          onPrev={handlePrev}
          onNext={handleNext}
          onRemember={() => handleRemember(currentKanji)}
        />
      )}
    </div>
  );
}

export default function KanjiPage() {
  return (
    <Suspense fallback={null}>
      <KanjiPageContent />
    </Suspense>
  );
}
