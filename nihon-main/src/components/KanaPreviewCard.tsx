"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import kanaData from "@/store/kana-data.json";
import { KanaCell } from "@/types/kana";
import InteractiveSentence from "@/components/InteractiveSentence";

const svgLookup = kanaData.strokeSvgs as Record<string, string>;

interface KanaPreviewCardProps {
  currentCell: KanaCell;
  onPrev: () => void;
  onNext: () => void;
}

interface DetailItem {
  word: string;
  wordRomaji: string;
  wordMeaning: string;
  sentence: string;
  romaji: string;
  meaning: string;
}

export default function KanaPreviewCard({
  currentCell,
  onPrev,
  onNext,
}: KanaPreviewCardProps) {
  const kanaDetails = kanaData.kanaDetails as Record<
    string,
    {
      h: DetailItem;
      k: DetailItem;
    }
  >;

  // Reset SVG paths to visible when active character changes
  useEffect(() => {
    // Reset Hiragana
    const hContainer = document.getElementById("preview-svg-h");
    if (hContainer) {
      const paths = hContainer.querySelectorAll('g[data-strokesvg="strokes"] path');
      paths.forEach((path: any) => {
        try {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: 0 });
        } catch (e) {}
      });
    }

    // Reset Katakana
    const kContainer = document.getElementById("preview-svg-k");
    if (kContainer) {
      const paths = kContainer.querySelectorAll('g[data-strokesvg="strokes"] path');
      paths.forEach((path: any) => {
        try {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: 0 });
        } catch (e) {}
      });
    }
  }, [currentCell.romaji]);



  const triggerAnimation = (side: "h" | "k") => {
    const containerId = side === "h" ? "preview-svg-h" : "preview-svg-k";
    const container = document.getElementById(containerId);
    if (!container) return;

    const paths = container.querySelectorAll('g[data-strokesvg="strokes"] path');
    if (paths.length === 0) return;

    const tl = gsap.timeline();

    paths.forEach((path: any) => {
      try {
        const length = path.getTotalLength();
        // Hide initially
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        // Animate stroke writing smoothly
        tl.to(path, {
          strokeDashoffset: 0,
          duration: 0.5,
          ease: "sine.inOut",
        });
      } catch (e) {}
    });
  };

  const previewInfo = kanaDetails[currentCell.romaji];
  if (!previewInfo) return null;

  const hSvgText = svgLookup[currentCell.h] || null;
  const kSvgText = svgLookup[currentCell.k] || null;

  return (
    <div className="w-full max-w-[820px] mt-6 rounded-none">
      {/* Central Card */}
      <div className="bg-white border border-[#e2dfd7] p-5 rounded-none shadow-[1px_1px_0px_rgba(0,0,0,0.01)] flex flex-col items-center select-none cursor-default">
        {/* Header: Prev Arrow, Romaji Head, Next Arrow */}
        <div className="flex items-center justify-between w-full max-w-[320px] mb-4 select-none">
          <button
            onClick={onPrev}
            className="text-[#a8a196] hover:text-[#1e1c1b] transition-colors duration-150 text-2xl font-pixel cursor-pointer px-3"
          >
            ←
          </button>
          <div className="text-xl font-pixel font-bold text-[#1e1c1b] uppercase tracking-wider">
            {currentCell.romaji}
          </div>
          <button
            onClick={onNext}
            className="text-[#a8a196] hover:text-[#1e1c1b] transition-colors duration-150 text-2xl font-pixel cursor-pointer px-3"
          >
            →
          </button>
        </div>

        {/* Split layout: Hiragana Left, Katakana Right */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full border-t border-[#f2efe8] pt-5 rounded-none">
          {/* Hiragana Side */}
          <div className="flex flex-col pr-0 sm:pr-6 border-b sm:border-b-0 sm:border-r border-[#f2efe8] pb-6 sm:pb-0 rounded-none">
            <span className="text-[9px] font-pixel text-[#a8a196] uppercase tracking-wider mb-3">
              Hiragana
            </span>
            <div className="flex flex-col items-center mb-3">
              <div
                id="preview-svg-h"
                className="w-18 h-18 bg-[#faf8f5] border border-[#e2dfd7] p-1.5 rounded-none [&_svg]:w-full [&_svg]:h-full [&_svg]:[--shadow:#efece3] [&_svg]:[--stroke:#2c2a29]"
                dangerouslySetInnerHTML={{ __html: hSvgText || "" }}
              />
              <button
                onClick={() => triggerAnimation("h")}
                className="mt-2 text-[8px] font-pixel text-[#7a756c] hover:text-[#1e1c1b] border border-[#e2dfd7] px-2 py-1 bg-[#faf8f5] cursor-pointer select-none rounded-none active:bg-[#efece3]"
              >
                ▶ ANIMATE
              </button>
            </div>

            <div className="flex flex-col gap-2 text-left">
              <div>
                <span className="text-[8px] font-pixel text-[#a8a196] uppercase">Word</span>
                <p className="text-sm font-medium text-[#2c2a29]">
                  {previewInfo.h.word}{" "}
                  {previewInfo.h.wordRomaji && (
                    <span className="text-[#a8a196] font-normal font-mono text-xs ml-1">
                      "{previewInfo.h.wordRomaji}"
                    </span>
                  )}
                </p>
                {previewInfo.h.wordMeaning && (
                  <p className="text-xs text-[#7a756c] mt-0.5">{previewInfo.h.wordMeaning}</p>
                )}
              </div>
              <div className="border-t border-[#fcfbf9] pt-1">
                <span className="text-[8px] font-pixel text-[#a8a196] uppercase">Sentence</span>
                <div className="text-sm text-[#2c2a29] leading-relaxed">
                  <InteractiveSentence sentence={previewInfo.h.sentence} targetWord={previewInfo.h.word} />
                </div>
                <p className="text-[10px] text-[#7a756c] font-mono mt-0.5">
                  {previewInfo.h.romaji}
                </p>
                <p className="text-[10px] text-[#a8a196] mt-0.5">
                  {previewInfo.h.meaning}
                </p>
              </div>
            </div>
          </div>

          {/* Katakana Side */}
          <div className="flex flex-col pl-2 rounded-none">
            <span className="text-[9px] font-pixel text-[#a8a196] uppercase tracking-wider mb-3">
              Katakana
            </span>
            <div className="flex flex-col items-center mb-3">
              <div
                id="preview-svg-k"
                className="w-18 h-18 bg-[#faf8f5] border border-[#e2dfd7] p-1.5 rounded-none [&_svg]:w-full [&_svg]:h-full [&_svg]:[--shadow:#efece3] [&_svg]:[--stroke:#2c2a29]"
                dangerouslySetInnerHTML={{ __html: kSvgText || "" }}
              />
              <button
                onClick={() => triggerAnimation("k")}
                className="mt-2 text-[8px] font-pixel text-[#7a756c] hover:text-[#1e1c1b] border border-[#e2dfd7] px-2 py-1 bg-[#faf8f5] cursor-pointer select-none rounded-none active:bg-[#efece3]"
              >
                ▶ ANIMATE
              </button>
            </div>

            <div className="flex flex-col gap-2 text-left">
              <div>
                <span className="text-[8px] font-pixel text-[#a8a196] uppercase">Word</span>
                <p className="text-sm font-medium text-[#2c2a29]">
                  {previewInfo.k.word}{" "}
                  {previewInfo.k.wordRomaji && (
                    <span className="text-[#a8a196] font-normal font-mono text-xs ml-1">
                      "{previewInfo.k.wordRomaji}"
                    </span>
                  )}
                </p>
                {previewInfo.k.wordMeaning && (
                  <p className="text-xs text-[#7a756c] mt-0.5">{previewInfo.k.wordMeaning}</p>
                )}
              </div>
              <div className="border-t border-[#fcfbf9] pt-1">
                <span className="text-[8px] font-pixel text-[#a8a196] uppercase">Sentence</span>
                <div className="text-sm text-[#2c2a29] leading-relaxed">
                  <InteractiveSentence sentence={previewInfo.k.sentence} targetWord={previewInfo.k.word} />
                </div>
                <p className="text-[10px] text-[#7a756c] font-mono mt-0.5">
                  {previewInfo.k.romaji}
                </p>
                <p className="text-[10px] text-[#a8a196] mt-0.5">
                  {previewInfo.k.meaning}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
