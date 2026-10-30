import { describe, expect, expectTypeOf, it } from "vitest";
import { fixtures, validUser } from "../src/fixtures";
import type { User } from "../src/types";
import { isUser } from "../src/validators/handwritten";

describe("handwritten guard", () => {
  it.each(fixtures)("$name -> $expected", ({ input, expected }) => {
    expect(isUser(input)).toBe(expected);
  });

  it("narrows unknown to User", () => {
    const input: unknown = validUser();
    if (!isUser(input)) throw new Error("expected a valid user");
    expectTypeOf(input).toEqualTypeOf<User>();
    expect(input.profile.active).toBe(true);
  });

  it("only answers yes or no", () => {
    // A type guard returns a boolean. There is no built-in way to ask why.
    expect(isUser({ ...validUser(), age: 17 })).toBe(false);
  });
});
