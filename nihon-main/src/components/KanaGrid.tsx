"use client";

import kanaData from "@/store/kana-data.json";
import { KanaCell, KanaRow } from "@/types/kana";

const svgLookup = kanaData.strokeSvgs as Record<string, string>;

interface KanaGridProps {
  currentCell: KanaCell;
  onCellClick: (cell: KanaCell) => void;
}

export default function KanaGrid({ currentCell, onCellClick }: KanaGridProps) {
  const renderRow = (row: KanaRow) => (
    <div key={row.label} className="flex items-center gap-4 rounded-none">
      {/* Row Label Header */}
      <div className="text-xs font-pixel font-bold text-[#5e5850] uppercase tracking-widest w-8 text-left select-none">
        {row.label}
      </div>

      {/* Row Cells */}
      <div className="flex gap-3 rounded-none">
        {row.cells.map((cell, index) => {
          const cellKey = `${row.label}-${index}`;

          if (cell.empty) {
            return <div key={cellKey} className="w-14 h-14 rounded-none" />;
          }

          const hSvg = svgLookup[cell.h] || "";
          const kSvg = svgLookup[cell.k] || "";
          const isSelected = currentCell.romaji === cell.romaji;

          return (
            <button
              key={cellKey}
              onClick={() => onCellClick(cell)}
              className={`flex flex-col items-center w-14 rounded-none group cursor-pointer transition-transform duration-100 ${isSelected ? "scale-105" : ""
                }`}
            >
              {/* SVG Cell */}
              <div
                className={`w-14 h-14 border relative rounded-none transition-colors duration-150 ${isSelected
                  ? "border-[#8c857b] bg-[#efece3] shadow-[1px_1px_0px_rgba(0,0,0,0.1)]"
                  : "border-[#e2dfd7] bg-white hover:border-[#8c857b] shadow-[1px_1px_0px_rgba(0,0,0,0.02)]"
                  }`}
              >
                {/* Hiragana Top-Left */}
                <div
                  className="absolute top-0.5 left-0.5 w-7 h-7 pointer-events-none [&_svg]:w-full [&_svg]:h-full [&_svg]:[--shadow:transparent] [&_svg]:[--stroke:#2c2a29]"
                  dangerouslySetInnerHTML={{ __html: hSvg }}
                />

                {/* Diagonal Separator Line */}
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <line
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="0"
                      stroke={isSelected ? "#dcd8cf" : "#f2efe8"}
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>

                {/* Katakana Bottom-Right */}
                <div
                  className="absolute bottom-0.5 right-0.5 w-7 h-7 pointer-events-none [&_svg]:w-full [&_svg]:h-full [&_svg]:[--shadow:transparent] [&_svg]:[--stroke:#7a756c]"
                  dangerouslySetInnerHTML={{ __html: kSvg }}
                />
              </div>
              {/* Romaji label below */}
              <span
                className={`mt-1 text-[10px] font-pixel uppercase tracking-widest select-none transition-colors duration-150 ${isSelected ? "text-[#1e1c1b] font-bold" : "text-[#a8a196] group-hover:text-[#2c2a29]"
                  }`}
              >
                {cell.romaji}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2 w-full max-w-[820px] rounded-none">
      {/* Left Column: A to HA */}
      <div className="flex flex-col gap-2 justify-center rounded-none">
        {(kanaData.grid.left as KanaRow[]).map(renderRow)}
      </div>

      {/* Right Column: MA to N */}
      <div className="flex flex-col gap-2 justify-center rounded-none">
        {(kanaData.grid.right as KanaRow[]).map(renderRow)}
        {/* Spacer block to balance the 5 rows with the left 6 rows layout height */}
        <div className="h-14 mt-1 rounded-none hidden lg:block" />
      </div>
    </div>
  );
}
