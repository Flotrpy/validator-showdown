import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validUser } from "../src/fixtures";
import { validators } from "../src/validators";

describe.each(validators)("$name edge cases", ({ isUser }) => {
  describe("age boundaries", () => {
    it.each([
      [17, false],
      [18, true],
      [120, true],
      [121, false],
      [18.5, false],
      [119.999, false],
    ])("age %s -> %s", (age, expected) => {
      expect(isUser({ ...validUser(), age })).toBe(expected);
    });
  });

  describe("name boundaries", () => {
    it.each([
      [0, false],
      [1, true],
      [100, true],
      [101, false],
    ])("%i ASCII characters -> %s", (length, expected) => {
      expect(isUser({ ...validUser(), name: "x".repeat(length) })).toBe(expected);
    });
  });

  describe("emoji length (UTF-16 code units)", () => {
    it("accepts 50 emoji, which is exactly 100 code units", () => {
      expect(isUser({ ...validUser(), name: "😀".repeat(50) })).toBe(true);
    });

    it("rejects 51 emoji, which is 102 code units", () => {
      expect(isUser({ ...validUser(), name: "😀".repeat(51) })).toBe(false);
    });

    it("counts a lone emoji as 2 units, so it passes the minimum of 1", () => {
      expect(isUser({ ...validUser(), name: "😀" })).toBe(true);
    });
  });
});

describe("why the Zod validator needs .refine()", () => {
  const fiftyOneEmoji = "😀".repeat(51);

  it("51 emoji are 102 UTF-16 code units but only 51 code points", () => {
    expect(fiftyOneEmoji.length).toBe(102);
    // Array.from splits a string into code points, not UTF-16 units.
    expect(Array.from(fiftyOneEmoji).length).toBe(51);
  });

  it("Zod's built-in .max(100) counts code points and accepts them", () => {
    expect(z.string().max(100).safeParse(fiftyOneEmoji).success).toBe(true);
  });

  it("Zod's built-in .max(100) still rejects 101 ASCII characters", () => {
    expect(z.string().max(100).safeParse("x".repeat(101)).success).toBe(false);
  });
});
