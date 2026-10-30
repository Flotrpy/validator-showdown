import { describe, expect, it } from "vitest";
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
});
