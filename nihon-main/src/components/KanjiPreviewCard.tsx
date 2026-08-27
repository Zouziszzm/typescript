"use client";

import { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import kanjiData from "@/store/kanji-data.json";
import { KanjiItem } from "@/types/kanji";
import KanjiReadingPane from "@/components/KanjiReadingPane";

const svgLookup = kanjiData.strokeSvgs as Record<string, string>;

interface KanjiPreviewCardProps {
  currentKanji: string;
  onPrev: () => void;
  onNext: () => void;
  onRemember: () => void;
}

export default function KanjiPreviewCard({
  currentKanji,
  onPrev,
  onNext,
  onRemember,
}: KanjiPreviewCardProps) {
  const kanjiDetails = kanjiData.kanjiDetails as Record<string, KanjiItem>;
  const previewInfo = kanjiDetails[currentKanji];

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [showNumbers, setShowNumbers] = useState(true);

  // Load showNumbers from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("kanji_show_numbers");
    if (saved !== null) {
      setShowNumbers(saved === "true");
    }
  }, []);

  const handleToggleNumbers = () => {
    const nextVal = !showNumbers;
    setShowNumbers(nextVal);
    localStorage.setItem("kanji_show_numbers", String(nextVal));
  };

  // Reset SVG paths to visible when active character changes
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    const container = document.getElementById("preview-svg-kanji");
    if (container) {
      const paths = container.querySelectorAll('g[id^="kvg:StrokePaths_"] path');
      paths.forEach((path: any) => {
        try {
          const length = path.getTotalLength();
          gsap.set(path, { 
            strokeDasharray: length, 
            strokeDashoffset: 0,
            opacity: 1
          });
        } catch (e) {}
      });
    }
  }, [currentKanji]);

  const triggerAnimation = () => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const container = document.getElementById("preview-svg-kanji");
    if (!container) return;

    const paths = container.querySelectorAll('g[id^="kvg:StrokePaths_"] path');
    if (paths.length === 0) return;

    const tl = gsap.timeline();
    timelineRef.current = tl;

    paths.forEach((path: any) => {
      try {
        let length = path.getTotalLength();
        if (length === 0) length = 5; // fallback
        
        // Hide initially using both dashoffset and opacity
        gsap.set(path, { 
          strokeDasharray: length, 
          strokeDashoffset: length,
          opacity: 0
        });
        
        // Animate: draw and fade in the path simultaneously
        tl.to(path, {
          opacity: 1,
          strokeDashoffset: 0,
          duration: 0.6,
          ease: "sine.inOut",
        });
      } catch (e) {}
    });
  };

  if (!previewInfo) return null;

  const svgText = svgLookup[currentKanji] || "";

  return (
    <div className="w-full max-w-[820px] mt-6 rounded-none">
      {/* Central Card */}
      <div className="bg-white border border-[#e2dfd7] p-5 rounded-none shadow-[1px_1px_0px_rgba(0,0,0,0.01)] flex flex-col items-center select-none cursor-default">
        {/* Header: Prev Arrow, Selected Kanji, Next Arrow */}
        <div className="flex items-center justify-between w-full max-w-[320px] mb-4 select-none">
          <button
            onClick={onPrev}
            className="text-[#a8a196] hover:text-[#1e1c1b] transition-colors duration-150 text-2xl font-pixel cursor-pointer px-3"
          >
            ←
          </button>
          <div className="w-8 h-8 flex items-center justify-center">
            {svgText ? (
              <div
                className="w-7 h-7 pointer-events-none [&_svg]:w-full [&_svg]:h-full [&_svg_path]:stroke-[#2c2a29] [&_svg_path]:stroke-[6px] [&_svg_text]:hidden"
                dangerouslySetInnerHTML={{ __html: svgText }}
              />
            ) : (
              <span className="text-xl font-pixel font-bold text-[#1e1c1b]">{currentKanji}</span>
            )}
          </div>
          <button
            onClick={onNext}
            className="text-[#a8a196] hover:text-[#1e1c1b] transition-colors duration-150 text-2xl font-pixel cursor-pointer px-3"
          >
            →
          </button>
        </div>

        {/* Card Body */}
        <div className="flex flex-col items-center w-full border-t border-[#f2efe8] pt-5 rounded-none">
          {/* Kanji SVG Canvas Box */}
          <div
            id="preview-svg-kanji"
            className={`w-20 h-20 bg-[#faf8f5] border border-[#e2dfd7] p-1.5 rounded-none [&_svg]:w-full [&_svg]:h-full [&_svg_path]:stroke-[#2c2a29] [&_svg_path]:stroke-[4px] ${
              showNumbers
                ? "[&_svg_text]:block [&_svg_text]:fill-[#a8a196]"
                : "[&_svg_text]:hidden"
            }`}
            dangerouslySetInnerHTML={{ __html: svgText }}
          />

          <div className="flex gap-2 mt-2.5">
            <button
              onClick={triggerAnimation}
              className="text-[8px] font-pixel text-[#7a756c] hover:text-[#1e1c1b] border border-[#e2dfd7] px-2 py-1 bg-[#faf8f5] cursor-pointer select-none rounded-none active:bg-[#efece3]"
            >
              ▶ ANIMATE
            </button>
            <button
              onClick={onRemember}
              className="text-[8px] font-pixel text-[#2b8a4a] hover:text-[#1a6230] border border-[#d2edd9] px-2 py-1 bg-[#f4fbf6] cursor-pointer select-none rounded-none active:bg-[#dff5e6] tracking-wider font-bold"
            >
              ★ REMEMBER
            </button>
            <button
              onClick={handleToggleNumbers}
              className={`text-[8px] font-pixel border px-2 py-1 cursor-pointer select-none rounded-none active:bg-[#efece3] ${
                showNumbers
                  ? "text-[#1e1c1b] border-[#1e1c1b] bg-[#efece3]"
                  : "text-[#7a756c] border-[#e2dfd7] bg-[#faf8f5]"
              }`}
            >
              NUMBERS: {showNumbers ? "ON" : "OFF"}
            </button>
          </div>

          {/* Romaji & Meaning Section */}
          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="text-[9px] font-pixel text-[#a8a196] uppercase tracking-widest">
              Romaji & Meaning
            </span>
            <p className="text-sm font-semibold text-[#1e1c1b] font-mono tracking-wide">
              {previewInfo.romaji}
            </p>
            <p className="text-xs text-[#5e5850]">
              {previewInfo.meaning}
            </p>
          </div>

          {/* Onyomi & Kunyomi Reading Split Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full border-t border-[#f2efe8] pt-4 mt-4 rounded-none">
            {/* Onyomi Side */}
            <div className="pr-0 sm:pr-6 border-b sm:border-b-0 sm:border-r border-[#f2efe8] pb-6 sm:pb-0 rounded-none">
              <KanjiReadingPane
                label="Onyomi (Chinese)"
                reading={previewInfo.onyomi}
                example={previewInfo.onyomiExample}
                currentKanji={currentKanji}
              />
            </div>

            {/* Kunyomi Side */}
            <div className="pl-2 rounded-none">
              <KanjiReadingPane
                label="Kunyomi (Japanese)"
                reading={previewInfo.kunyomi}
                example={previewInfo.kunyomiExample}
                currentKanji={currentKanji}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
