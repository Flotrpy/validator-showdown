import { describe, expect, it } from "vitest";
import { fixtures } from "../src/fixtures";
import { validators } from "../src/validators";

/** Freeze an object and everything inside it, so any write throws. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

describe.each(validators)("$name does not mutate input", ({ isUser }) => {
  it.each(fixtures)("$name stays deeply equal", ({ input }) => {
    const before = structuredClone(input);
    isUser(input);
    expect(input).toStrictEqual(before);
  });

  it.each(fixtures)("$name works on a frozen copy", ({ input, expected }) => {
    // ES modules run in strict mode, so writing to a frozen object throws.
    const frozen = deepFreeze(structuredClone(input));
    expect(isUser(frozen)).toBe(expected);
  });
});
