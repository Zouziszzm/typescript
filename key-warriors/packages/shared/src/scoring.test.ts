import { describe, expect, it } from "vitest";
import {
  calculateAccuracy,
  calculateWpm,
  comparePartialInput,
  compareWord,
  nextSeat,
  tokenizeText,
} from "./scoring";

describe("calculateWpm", () => {
  it("uses Monkeytype convention (chars/5 per minute)", () => {
    expect(calculateWpm(50, 60_000)).toBe(10);
  });

  it("returns 0 for zero duration", () => {
    expect(calculateWpm(50, 0)).toBe(0);
  });
});

describe("calculateAccuracy", () => {
  it("returns 100 when no chars typed", () => {
    expect(calculateAccuracy(0, 0)).toBe(100);
  });

  it("computes percentage", () => {
    expect(calculateAccuracy(90, 10)).toBe(90);
  });
});

describe("tokenizeText", () => {
  it("splits on whitespace", () => {
    expect(tokenizeText("  hello  world  ")).toEqual(["hello", "world"]);
  });
});

describe("compareWord", () => {
  it("marks exact match correct", () => {
    expect(compareWord("hello", "hello")).toEqual({
      correctChars: 5,
      incorrectChars: 0,
      correct: true,
    });
  });

  it("counts extras as incorrect", () => {
    const r = compareWord("hi", "hix");
    expect(r.correct).toBe(false);
    expect(r.incorrectChars).toBeGreaterThan(0);
  });
});

describe("comparePartialInput", () => {
  it("classifies characters", () => {
    expect(comparePartialInput("hello", "heX")).toEqual([
      "correct",
      "correct",
      "incorrect",
      "pending",
      "pending",
    ]);
  });
});

describe("nextSeat", () => {
  it("wraps around", () => {
    expect(nextSeat(0, 3)).toBe(1);
    expect(nextSeat(2, 3)).toBe(0);
    expect(nextSeat(1, 2)).toBe(0);
  });
});
