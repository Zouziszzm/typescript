import {
  LIFE_MS_PER_CHAR,
  MAX_LIVES,
  type GameSettings,
} from "./types.js";

export type CharState = "correct" | "incorrect" | "pending";

/** Reject backspace: new input must not be shorter than previous. */
export function validateHardcoreInput(
  previous: string,
  next: string
): { ok: true } | { ok: false; reason: string } {
  if (next.length < previous.length) {
    return { ok: false, reason: "Backspace disabled in hardcore mode" };
  }
  if (!next.startsWith(previous)) {
    return { ok: false, reason: "Invalid input" };
  }
  return { ok: true };
}

export function hardcoreCharStates(
  expected: string,
  typed: string
): CharState[] {
  const states: CharState[] = [];
  for (let i = 0; i < expected.length; i++) {
    if (i >= typed.length) {
      states.push("pending");
    } else if (typed[i] === expected[i]) {
      states.push("correct");
    } else {
      states.push("incorrect");
    }
  }
  return states;
}

export function isHardcoreWordComplete(expected: string, typed: string): boolean {
  return typed.length >= expected.length;
}

export function isPerfectWord(expected: string, typed: string): boolean {
  return typed === expected;
}

export function lifeWordTimeLimitMs(word: string): number {
  return Math.max(word.length * LIFE_MS_PER_CHAR, LIFE_MS_PER_CHAR * 2);
}

/** Pick ~every 5th word and short words (3–5 chars) as life-word candidates. */
export function pickLifeWordIndices(words: string[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (i > 0 && i % 5 === 4) indices.push(i);
    else if (w.length >= 3 && w.length <= 5 && i % 3 === 2) indices.push(i);
  }
  return [...new Set(indices)];
}

export function isLifeWord(index: number, lifeWordIndices: number[]): boolean {
  return lifeWordIndices.includes(index);
}

export function initialLives(settings: GameSettings): number {
  return settings.livesEnabled ? MAX_LIVES : 0;
}

export function shouldUseHardcoreRules(settings: GameSettings): boolean {
  return settings.typingMode === "hardcore";
}

export type LifeWordOutcome =
  | { type: "gain"; newLives: number }
  | { type: "lose"; newLives: number }
  | { type: "none" };

export function resolveLifeWord(
  lives: number,
  livesEnabled: boolean,
  isLife: boolean,
  perfect: boolean,
  withinTime: boolean,
  hadErrors: boolean
): LifeWordOutcome {
  if (!livesEnabled) return { type: "none" };

  if (isLife && perfect && withinTime && lives < MAX_LIVES) {
    return { type: "gain", newLives: Math.min(MAX_LIVES, lives + 1) };
  }

  if (hadErrors || (isLife && !withinTime)) {
    return { type: "lose", newLives: Math.max(0, lives - 1) };
  }

  return { type: "none" };
}
