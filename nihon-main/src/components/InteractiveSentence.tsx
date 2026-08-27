"use client";

import { useState, useMemo } from "react";
import dictionary from "@/store/dictionary.json";
import { Volume2 } from "lucide-react";

interface InteractiveSentenceProps {
  sentence: string;
  targetWord?: string; // The primary character/word being studied (highlighted in green)
}

interface DictEntry {
  meaning: string;
  type: string;
}

interface Token {
  text: string;
  meaning?: string;
  type?: string;
  isTarget: boolean;
}

const dictKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);

export default function InteractiveSentence({
  sentence,
  targetWord,
}: InteractiveSentenceProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleSpeak = () => {
    try {
      // Route the audio request through our internal Next.js API proxy to bypass browser CORS / Opaque response blocking
      const url = `/api/tts?text=${encodeURIComponent(sentence)}`;
      const audio = new Audio(url);
      
      audio.play().catch(error => {
        console.error("Audio playback blocked or not supported:", error);
      });
    } catch (error) {
      console.error("TTS playback failed:", error);
    }
  };

  const tokens = useMemo(() => {
    const result: Token[] = [];
    let i = 0;
    const len = sentence.length;

    while (i < len) {
      // 1. Check if it starts with any key in the dictionary (greedy matching)
      let matched = false;
      for (const key of dictKeys) {
        if (sentence.startsWith(key, i)) {
          const entry = (dictionary as Record<string, DictEntry>)[key];
          
          result.push({
            text: key,
            meaning: entry.meaning,
            type: entry.type,
            isTarget: targetWord === key,
          });
          i += key.length;
          matched = true;
          break;
        }
      }

      // 2. Fallback: Check if it matches the targetWord (if targetWord isn't in dictionary or was missed)
      if (!matched && targetWord && sentence.startsWith(targetWord, i)) {
        const entry = (dictionary as Record<string, DictEntry>)[targetWord];
        result.push({
          text: targetWord,
          meaning: entry ? entry.meaning : "Target study character",
          type: entry ? entry.type : "Target Kanji",
          isTarget: true,
        });
        i += targetWord.length;
        matched = true;
      }

      // 3. Fallback: treat single character as untranslated text
      if (!matched) {
        const char = sentence[i];
        // If the last token was untranslated plain text, merge it to keep spans clean
        const lastToken = result[result.length - 1];
        if (lastToken && !lastToken.meaning && !lastToken.isTarget) {
          lastToken.text += char;
        } else {
          result.push({
            text: char,
            isTarget: false,
          });
        }
        i++;
      }
    }

    return result;
  }, [sentence, targetWord]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <div className="flex flex-wrap items-center gap-x-0.5 leading-relaxed py-1 flex-1">
          {tokens.map((tok, idx) => {
            const hasMeaning = !!tok.meaning;
            
            // Base styling for the token wrapper
            let wrapperClass = "transition-all duration-150 rounded-sm px-0.5 ";
            
            // If the entire word is exactly the target word
            if (tok.isTarget) {
              wrapperClass += "text-[#2b8a4a] underline decoration-2 underline-offset-2 font-semibold cursor-pointer hover:bg-[#f4fbf6]";
            } else if (hasMeaning) {
              wrapperClass += "text-[#2c2a29] cursor-pointer border-b border-dashed border-[#a8a196] hover:bg-[#efece3]";
            } else {
              wrapperClass += "text-[#2c2a29]";
            }

            // Handle highlighting targetWord inside a larger dictionary word (e.g. 品 inside 商品)
            let renderedText: React.ReactNode = tok.text;
            if (targetWord && !tok.isTarget && tok.text.includes(targetWord)) {
              const parts = tok.text.split(new RegExp(`(${targetWord})`, 'g'));
              renderedText = parts.map((part, pIdx) => {
                if (part === targetWord) {
                  return (
                    <span key={pIdx} className="text-[#2b8a4a] font-semibold">
                      {part}
                    </span>
                  );
                }
                return <span key={pIdx}>{part}</span>;
              });
            }

            return (
              <span
                key={`${tok.text}-${idx}`}
                onMouseEnter={() => hasMeaning && setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative inline-block select-none"
              >
                <span className={wrapperClass}>{renderedText}</span>
              </span>
            );
          })}
        </div>
        
        {/* TTS Pronunciation Button */}
        <button
          onClick={handleSpeak}
          className="mt-1 p-1.5 shrink-0 rounded-full hover:bg-[#efece3] transition-colors text-[#a8a196] hover:text-[#2c2a29]"
          title="Listen to pronunciation"
          aria-label="Play pronunciation"
        >
          <Volume2 size={14} />
        </button>
      </div>

      {/* Expanded translation area below the sentence (Animated) */}
      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          hoveredIndex !== null && tokens[hoveredIndex].meaning
            ? "grid-rows-[1fr] opacity-100 mt-1"
            : "grid-rows-[0fr] opacity-0 mt-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="h-7 flex items-center bg-[#faf8f5] border border-[#e2dfd7] px-2.5 shadow-sm rounded-sm w-full">
            {hoveredIndex !== null && tokens[hoveredIndex].meaning && (
              <div className="flex items-baseline gap-2 truncate">
                <span className="text-xs font-bold text-[#2b8a4a] leading-none">
                  {tokens[hoveredIndex].text}
                </span>
                <span className="text-[9.5px] font-pixel text-[#1e1c1b] tracking-wider uppercase font-semibold leading-none">
                  {tokens[hoveredIndex].meaning}
                </span>
                {tokens[hoveredIndex].type && (
                  <span className="text-[8px] font-pixel text-[#7a756c] tracking-widest uppercase leading-none">
                    [{tokens[hoveredIndex].type}]
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
