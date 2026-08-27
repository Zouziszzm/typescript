"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import kanaData from "@/store/kana-data.json";
import { KanaCell } from "@/types/kana";
import KanaGrid from "@/components/KanaGrid";
import KanaPreviewCard from "@/components/KanaPreviewCard";

function KanaPageContent() {
  const searchParams = useSearchParams();

  // Flatten active cells to navigate easily with Next/Prev keys
  const activeCells: KanaCell[] = [
    ...(kanaData.grid.left as any[]).flatMap((r) => (r.cells as any[]).filter((c) => !c.empty)),
    ...(kanaData.grid.right as any[]).flatMap((r) => (r.cells as any[]).filter((c) => !c.empty)),
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const currentCell = activeCells[activeIndex];

  // Sync selection with URL query parameter ?char=...
  useEffect(() => {
    const char = searchParams.get("char");
    if (char) {
      const idx = activeCells.findIndex((c) => c.romaji === char);
      if (idx !== -1) {
        setActiveIndex(idx);
      }
    }
  }, [searchParams, activeCells]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? activeCells.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === activeCells.length - 1 ? 0 : prev + 1));
  };

  const handleCellClick = (cell: KanaCell) => {
    const idx = activeCells.findIndex((c) => c.romaji === cell.romaji);
    if (idx !== -1) {
      setActiveIndex(idx);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 py-4 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] rounded-none">
      {/* Upper Grid Section */}
      <KanaGrid currentCell={currentCell} onCellClick={handleCellClick} />

      {/* Bottom Preview Area */}
      {currentCell && (
        <KanaPreviewCard
          currentCell={currentCell}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
}

export default function KanaPage() {
  return (
    <Suspense fallback={null}>
      <KanaPageContent />
    </Suspense>
  );
}
