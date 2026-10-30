import { describe, expect, it } from "vitest";
import { fixtures } from "../src/fixtures";
import { validators } from "../src/validators";

describe("fixture set", () => {
  it("has at least 30 fixtures", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(30);
  });

  it("uses unique fixture names", () => {
    const names = fixtures.map((fixture) => fixture.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("explains every fixture", () => {
    for (const fixture of fixtures) {
      expect(fixture.why.trim(), fixture.name).not.toBe("");
    }
  });
});

describe("cross-validator agreement", () => {
  it.each(fixtures)("all validators agree on: $name", ({ input, expected }) => {
    const actual = Object.fromEntries(validators.map((v) => [v.name, v.isUser(input)]));
    const wanted = Object.fromEntries(validators.map((v) => [v.name, expected]));
    // Comparing whole objects means a failure shows every validator's answer at once.
    expect(actual).toEqual(wanted);
  });
});
