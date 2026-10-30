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

  describe("extra keys", () => {
    it("rejects an extra root key", () => {
      expect(isUser({ ...validUser(), email: "ada@example.com" })).toBe(false);
    });

    it("rejects an extra key inside profile", () => {
      const profile = { bio: "", active: true, avatar: "ada.png" };
      expect(isUser({ ...validUser(), profile })).toBe(false);
    });

    it("rejects an extra key even when its value is null", () => {
      expect(isUser({ ...validUser(), nickname: null })).toBe(false);
    });

    it("rejects an own __proto__ key created by JSON.parse", () => {
      const input: unknown = JSON.parse(`{"__proto__":{},${JSON.stringify(validUser()).slice(1)}`);
      expect(isUser(input)).toBe(false);
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

describe("outside the JSON input domain", () => {
  // JSON.parse never produces an object with a prototype chain like this, so
  // this is not a shared fixture. It records a real difference anyway: the
  // libraries walk keys with for...in (own + inherited), the handwritten guard
  // uses Object.keys (own only).
  const input: unknown = Object.assign(Object.create({ inherited: true }) as object, validUser());

  it.each([
    ["Handwritten", true],
    ["Zod", false],
    ["Valibot", false],
  ])("%s on an object with an inherited enumerable key -> %s", (name, expected) => {
    const validator = validators.find((v) => v.name === name);
    expect(validator?.isUser(input)).toBe(expected);
  });
});
