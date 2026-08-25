"use client";

import {
  comparePartialInput,
  hardcoreCharStates,
  isLifeWord,
} from "@key-warriors/shared";

type WordDisplayProps = {
  words: string[];
  currentWordIndex: number;
  activeInput: string;
  completedCorrect: Record<number, boolean>;
  isActiveTurn: boolean;
  hardcore?: boolean;
  lifeWordIndices?: number[];
};

export function WordDisplay({
  words,
  currentWordIndex,
  activeInput,
  completedCorrect,
  isActiveTurn,
  hardcore = false,
  lifeWordIndices = [],
}: WordDisplayProps) {
  return (
    <div
      className="font-mono text-2xl leading-relaxed tracking-wide text-zinc-500 select-none"
      aria-live="polite"
    >
      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {words.map((word, index) => {
          const isLife = isLifeWord(index, lifeWordIndices);

          if (index < currentWordIndex) {
            const ok = completedCorrect[index] !== false;
            return (
              <span
                key={`${word}-${index}`}
                className={ok ? "text-emerald-400" : "text-rose-400"}
              >
                {word}
              </span>
            );
          }

          if (index === currentWordIndex) {
            const states = hardcore
              ? hardcoreCharStates(word, activeInput)
              : comparePartialInput(word, activeInput);

            return (
              <span
                key={`${word}-${index}`}
                className={`relative rounded px-0.5 ${
                  isActiveTurn
                    ? "bg-zinc-800/80 ring-1 ring-amber-400/40"
                    : "bg-zinc-800/40"
                } ${isLife ? "ring-1 ring-emerald-500/50" : ""}`}
              >
                {isLife && (
                  <span className="absolute -top-4 left-0 text-[10px] uppercase tracking-wider text-emerald-400">
                    ♥ life
                  </span>
                )}
                {word.split("").map((char, ci) => {
                  const state = states[ci] ?? "pending";
                  const className =
                    state === "correct"
                      ? "text-emerald-300"
                      : state === "incorrect"
                        ? hardcore
                          ? "text-rose-500 line-through decoration-rose-600"
                          : "text-rose-400 underline decoration-rose-500"
                        : state === "extra"
                          ? "text-rose-500"
                          : "text-zinc-400";
                  return (
                    <span key={ci} className={className}>
                      {char}
                    </span>
                  );
                })}
                {!hardcore &&
                  activeInput.length > word.length &&
                  activeInput
                    .slice(word.length)
                    .split("")
                    .map((char, ci) => (
                      <span key={`extra-${ci}`} className="text-rose-500">
                        {char}
                      </span>
                    ))}
                {hardcore && activeInput.length < word.length && (
                  <span className="ml-px inline-block h-[1.1em] w-0.5 animate-pulse bg-amber-400 align-middle" />
                )}
                {isActiveTurn && !hardcore && (
                  <span className="absolute -bottom-0.5 left-0 h-0.5 w-full animate-pulse bg-amber-400" />
                )}
              </span>
            );
          }

          return (
            <span
              key={`${word}-${index}`}
              className={`text-zinc-500 ${isLife ? "underline decoration-emerald-500/40 decoration-dotted" : ""}`}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
