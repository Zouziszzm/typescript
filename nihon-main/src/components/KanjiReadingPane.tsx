"use client";

import { SentenceExample } from "@/types/kanji";
import InteractiveSentence from "@/components/InteractiveSentence";

interface KanjiReadingPaneProps {
  label: string;
  reading: string;
  example?: SentenceExample;
  currentKanji: string;
}

export default function KanjiReadingPane({
  label,
  reading,
  example,
  currentKanji,
}: KanjiReadingPaneProps) {
  return (
    <div className="flex flex-col rounded-none text-left">
      <span className="text-[9px] font-pixel text-[#a8a196] uppercase tracking-widest mb-1.5">
        {label}
      </span>
      <p className="text-xs font-semibold text-[#1e1c1b] font-mono tracking-wide">
        {reading || "-"}
      </p>

      {example?.sentence && (
        <div className="mt-3 border-t border-[#fcfbf9] pt-1.5">
          <span className="text-[8px] font-pixel text-[#a8a196] uppercase">
            Example Sentence
          </span>
          <div className="text-xs text-[#2c2a29] leading-relaxed mt-0.5">
            <InteractiveSentence sentence={example.sentence} targetWord={currentKanji} />
          </div>
          <p className="text-[10px] text-[#7a756c] font-mono mt-0.5">
            {example.romaji}
          </p>
          <p className="text-[10px] text-[#a8a196] mt-0.5">
            {example.meaning}
          </p>
        </div>
      )}
    </div>
  );
}
