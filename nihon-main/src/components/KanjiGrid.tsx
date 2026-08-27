"use client";

import kanjiData from "@/store/kanji-data.json";
import { KanjiTier } from "@/types/kanji";

interface KanjiGridProps {
  currentKanji: string;
  onKanjiClick: (char: string) => void;
  activeTier: string;
  onTierChange: (tierId: string) => void;
  visibleKanjis: string[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function KanjiGrid({
  currentKanji,
  onKanjiClick,
  activeTier,
  onTierChange,
  visibleKanjis,
  currentPage,
  onPageChange,
}: KanjiGridProps) {
  const tiers = [
    { id: "all", name: "ALL" },
    ...(kanjiData.tiers as KanjiTier[])
  ];

  // Pagination config: 10 columns x 5 rows = 50 items per page
  const itemsPerPage = 50;
  const totalPages = Math.ceil(visibleKanjis.length / itemsPerPage) || 1;

  // Get current page slices
  const paginatedKanjis = visibleKanjis.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Pad the page items to exactly 50 to maintain a fixed 5-row height (no shift/scroll)
  const gridItems = [...paginatedKanjis];
  while (gridItems.length < itemsPerPage) {
    gridItems.push("");
  }

  return (
    <div className="w-full max-w-[820px] flex flex-col items-center gap-4 rounded-none">
      {/* Tier Selector Headers */}
      <div className="flex gap-6 border-b border-[#e2dfd7] w-full justify-center select-none">
        {tiers.map((tier) => {
          const isActive = tier.id === activeTier;
          const count = tier.id === "all"
            ? Object.values(kanjiData.grid).reduce((acc: number, arr: any) => acc + (arr?.length || 0), 0)
            : ((kanjiData.grid as Record<string, string[]>)[tier.id] || []).length;
          return (
            <button
              key={tier.id}
              onClick={() => onTierChange(tier.id)}
              className={`text-xs font-pixel font-bold uppercase tracking-wider pb-2 transition-all duration-150 cursor-pointer border-b-2 -mb-[1px] ${
                isActive
                  ? "text-[#1e1c1b] border-[#1e1c1b]"
                  : "text-[#a8a196] border-transparent hover:text-[#5e5850]"
              }`}
            >
              {tier.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Kanji Cells Grid: 10 Columns */}
      <div className="w-full bg-white border border-[#e2dfd7] p-4 rounded-none shadow-[1px_1px_0px_rgba(0,0,0,0.01)] flex flex-col items-center">
        {visibleKanjis.length === 0 ? (
          <div className="text-xs font-pixel text-[#a8a196] py-16 uppercase tracking-wider select-none text-center">
            All Kanji Remembered in this Tier!
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 w-full justify-items-center">
              {gridItems.map((char, index) => {
                if (!char) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="w-10 h-10 border border-[#f2efe8] bg-[#faf8f5] opacity-30 rounded-none"
                    />
                  );
                }

                const isSelected = char === currentKanji;
                const strokeSvgs = kanjiData.strokeSvgs as Record<string, string>;
                const svgText = strokeSvgs[char] || "";

                return (
                  <button
                    key={char}
                    onClick={() => onKanjiClick(char)}
                    className={`w-10 h-10 border flex items-center justify-center transition-all duration-150 cursor-pointer select-none rounded-none ${
                      isSelected
                        ? "border-[#8c857b] bg-[#efece3] scale-105 shadow-[1px_1px_0px_rgba(0,0,0,0.1)]"
                        : "border-[#e2dfd7] bg-white hover:border-[#8c857b] hover:bg-[#faf8f5] shadow-[1px_1px_0px_rgba(0,0,0,0.01)]"
                    }`}
                  >
                    {svgText ? (
                      <div
                        className="w-7 h-7 pointer-events-none [&_svg]:w-full [&_svg]:h-full [&_svg_path]:stroke-[#2c2a29] [&_svg_path]:stroke-[6px] [&_svg_text]:hidden"
                        dangerouslySetInnerHTML={{ __html: svgText }}
                      />
                    ) : (
                      <span className="text-lg font-medium">{char}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-4 mt-4 select-none">
                <button
                  disabled={currentPage === 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="text-xs font-pixel text-[#7a756c] hover:text-[#1e1c1b] disabled:text-[#d3cfc9] disabled:cursor-not-allowed cursor-pointer px-2 py-1 border border-[#e2dfd7] bg-[#faf8f5] rounded-none active:bg-[#efece3]"
                >
                  ← PREV
                </button>
                <span className="text-[10px] font-pixel text-[#7a756c] tracking-widest uppercase">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="text-xs font-pixel text-[#7a756c] hover:text-[#1e1c1b] disabled:text-[#d3cfc9] disabled:cursor-not-allowed cursor-pointer px-2 py-1 border border-[#e2dfd7] bg-[#faf8f5] rounded-none active:bg-[#efece3]"
                >
                  NEXT →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
