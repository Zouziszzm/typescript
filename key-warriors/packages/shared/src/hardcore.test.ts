import { describe, expect, it } from "vitest";
import {
  hardcoreCharStates,
  isPerfectWord,
  lifeWordTimeLimitMs,
  pickLifeWordIndices,
  resolveLifeWord,
  validateHardcoreInput,
} from "./hardcore";

describe("validateHardcoreInput", () => {
  it("rejects backspace", () => {
    expect(validateHardcoreInput("hel", "he")).toEqual({
      ok: false,
      reason: "Backspace disabled in hardcore mode",
    });
  });

  it("allows append", () => {
    expect(validateHardcoreInput("he", "hel")).toEqual({ ok: true });
  });
});

describe("hardcoreCharStates", () => {
  it("marks locked incorrect chars", () => {
    expect(hardcoreCharStates("hello", "hxo")).toEqual([
      "correct",
      "incorrect",
      "incorrect",
      "pending",
      "pending",
    ]);
  });
});

describe("lifeWordTimeLimitMs", () => {
  it("uses 125ms per char", () => {
    expect(lifeWordTimeLimitMs("word")).toBe(500);
  });
});

describe("resolveLifeWord", () => {
  it("grants life on perfect timed life word", () => {
    expect(
      resolveLifeWord(2, true, true, true, true, false)
    ).toEqual({ type: "gain", newLives: 3 });
  });

  it("loses life on errors when lives enabled", () => {
    expect(
      resolveLifeWord(2, true, false, false, true, true)
    ).toEqual({ type: "lose", newLives: 1 });
  });
});

describe("isPerfectWord", () => {
  it("detects exact match", () => {
    expect(isPerfectWord("test", "test")).toBe(true);
    expect(isPerfectWord("test", "tst")).toBe(false);
  });
});

describe("pickLifeWordIndices", () => {
  it("returns some indices", () => {
    const words = Array.from({ length: 20 }, (_, i) => `word${i}`);
    expect(pickLifeWordIndices(words).length).toBeGreaterThan(0);
  });
});
