import type { PlayerProgress, PlayerStats } from "./types.js";

/** Monkeytype convention: WPM = (correctChars / 5) / minutes */
export function calculateWpm(correctChars: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const minutes = durationMs / 60_000;
  return Math.round((correctChars / 5 / minutes) * 100) / 100;
}

export function calculateAccuracy(
  correctChars: number,
  incorrectChars: number
): number {
  const total = correctChars + incorrectChars;
  if (total === 0) return 100;
  return Math.round((correctChars / total) * 10000) / 100;
}

export function tokenizeText(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export function compareWord(
  expected: string,
  typed: string
): { correctChars: number; incorrectChars: number; correct: boolean } {
  let correctChars = 0;
  let incorrectChars = 0;
  const maxLen = Math.max(expected.length, typed.length);

  for (let i = 0; i < maxLen; i++) {
    if (i >= typed.length || i >= expected.length) {
      incorrectChars += 1;
    } else if (typed[i] === expected[i]) {
      correctChars += 1;
    } else {
      incorrectChars += 1;
    }
  }

  return {
    correctChars,
    incorrectChars,
    correct: typed === expected,
  };
}

export function comparePartialInput(
  expected: string,
  typed: string
): Array<"correct" | "incorrect" | "extra" | "pending"> {
  const result: Array<"correct" | "incorrect" | "extra" | "pending"> = [];

  for (let i = 0; i < typed.length; i++) {
    if (i >= expected.length) {
      result.push("extra");
    } else if (typed[i] === expected[i]) {
      result.push("correct");
    } else {
      result.push("incorrect");
    }
  }

  for (let i = typed.length; i < expected.length; i++) {
    result.push("pending");
  }

  return result;
}

export function playerStatsFromProgress(
  player: PlayerProgress,
  durationMs: number
): PlayerStats {
  return {
    userId: player.userId,
    seat: player.seat,
    wpm: calculateWpm(player.correctChars, durationMs),
    accuracy: calculateAccuracy(player.correctChars, player.incorrectChars),
    correctChars: player.correctChars,
    incorrectChars: player.incorrectChars,
    completedWords: player.completedWords,
  };
}

export function teamStatsFromPlayers(
  players: PlayerProgress[],
  durationMs: number
): { teamWpm: number; teamAccuracy: number } {
  const correctChars = players.reduce((s, p) => s + p.correctChars, 0);
  const incorrectChars = players.reduce((s, p) => s + p.incorrectChars, 0);
  return {
    teamWpm: calculateWpm(correctChars, durationMs),
    teamAccuracy: calculateAccuracy(correctChars, incorrectChars),
  };
}

export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function nextSeat(currentSeat: number, playerCount: number): number {
  return (currentSeat + 1) % playerCount;
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 3;
export const COUNTDOWN_MS = 3000;
export const ROOM_TTL_SECONDS = 2 * 60 * 60;
