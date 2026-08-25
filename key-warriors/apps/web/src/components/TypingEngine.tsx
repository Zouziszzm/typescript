"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateAccuracy,
  calculateWpm,
  compareWord,
  isHardcoreWordComplete,
  isPerfectWord,
  type GameMode,
} from "@key-warriors/shared";
import { WordDisplay } from "./WordDisplay";

type TypingEngineProps = {
  words: string[];
  mode: GameMode;
  modeValue: number | null;
  hardcore?: boolean;
  enabled?: boolean;
  onComplete?: (stats: {
    wpm: number;
    accuracy: number;
    correctChars: number;
    incorrectChars: number;
    durationMs: number;
  }) => void;
};

export function TypingEngine({
  words,
  mode,
  modeValue,
  hardcore = false,
  enabled = true,
  onComplete,
}: TypingEngineProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [input, setInput] = useState("");
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [completedCorrect, setCompletedCorrect] = useState<
    Record<number, boolean>
  >({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const timeLimitMs =
    mode === "time" && modeValue ? modeValue * 1000 : null;
  const currentWord = words[wordIndex] ?? "";

  useEffect(() => {
    if (!startedAt || finished) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [startedAt, finished]);

  const elapsedMs = startedAt ? now - startedAt : 0;
  const remainingMs =
    timeLimitMs != null ? Math.max(0, timeLimitMs - elapsedMs) : null;

  const finish = useCallback(
    (durationOverride?: number) => {
      if (finished) return;
      const durationMs =
        durationOverride ?? (startedAt ? Date.now() - startedAt : 0);
      setFinished(true);
      onComplete?.({
        wpm: calculateWpm(correctChars, durationMs),
        accuracy: calculateAccuracy(correctChars, incorrectChars),
        correctChars,
        incorrectChars,
        durationMs,
      });
    },
    [finished, startedAt, correctChars, incorrectChars, onComplete]
  );

  useEffect(() => {
    if (remainingMs === 0 && startedAt && !finished) {
      finish(timeLimitMs ?? undefined);
    }
  }, [remainingMs, startedAt, finished, finish, timeLimitMs]);

  const ensureStarted = () => {
    if (!startedAt) setStartedAt(Date.now());
  };

  const completeWord = (typed: string) => {
    const expected = words[wordIndex];
    if (!expected) return;
    const result = compareWord(expected, typed.trimEnd());
    setCorrectChars((c) => c + result.correctChars);
    setIncorrectChars((c) => c + result.incorrectChars);
    setCompletedCorrect((prev) => ({
      ...prev,
      [wordIndex]: isPerfectWord(expected, typed.trimEnd()),
    }));

    const next = wordIndex + 1;
    setWordIndex(next);
    setInput("");

    if (mode === "words" && next >= words.length) finish();
    if ((mode === "quote" || mode === "custom") && next >= words.length)
      finish();
  };

  const onChange = (value: string) => {
    if (!enabled || finished) return;
    ensureStarted();

    if (hardcore) {
      if (value.length < input.length) return;
      if (value.endsWith(" ")) return;
      const capped = value.slice(0, currentWord.length);
      setInput(capped);
      if (isHardcoreWordComplete(currentWord, capped)) {
        completeWord(capped);
      }
      return;
    }

    if (value.endsWith(" ")) {
      completeWord(value.slice(0, -1));
      return;
    }
    setInput(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hardcore) return;
    if (e.key === "Backspace" || e.key === "Delete") e.preventDefault();
  };

  const wpm = useMemo(
    () => calculateWpm(correctChars, Math.max(elapsedMs, 1)),
    [correctChars, elapsedMs]
  );
  const accuracy = useMemo(
    () => calculateAccuracy(correctChars, incorrectChars),
    [correctChars, incorrectChars]
  );

  useEffect(() => {
    if (enabled) inputRef.current?.focus();
  }, [enabled]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
        <span>
          WPM <strong className="text-zinc-100">{Math.round(wpm)}</strong>
        </span>
        <span>
          Acc <strong className="text-zinc-100">{Math.round(accuracy)}%</strong>
        </span>
        {hardcore && (
          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300">
            Hardcore
          </span>
        )}
        {remainingMs != null ? (
          <span>
            Time{" "}
            <strong className="text-amber-300">
              {Math.ceil(remainingMs / 1000)}s
            </strong>
          </span>
        ) : (
          <span>
            Word{" "}
            <strong className="text-zinc-100">
              {Math.min(wordIndex + 1, words.length)}/{words.length}
            </strong>
          </span>
        )}
        {finished && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
            Done
          </span>
        )}
      </div>

      {hardcore && !finished && (
        <p className="text-xs text-zinc-500">
          No backspace — mistakes stay locked. Finish each word to continue.
        </p>
      )}

      <button
        type="button"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-left backdrop-blur-sm"
        onClick={() => inputRef.current?.focus()}
      >
        <WordDisplay
          words={words}
          currentWordIndex={wordIndex}
          activeInput={input}
          completedCorrect={completedCorrect}
          isActiveTurn={enabled && !finished}
          hardcore={hardcore}
        />
      </button>

      <input
        ref={inputRef}
        value={input}
        disabled={!enabled || finished}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="sr-only"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Typing input"
      />
    </div>
  );
}
