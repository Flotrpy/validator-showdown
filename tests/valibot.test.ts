import * as v from "valibot";
import { describe, expect, expectTypeOf, it } from "vitest";
import { fixtures, validUser } from "../src/fixtures";
import type { User } from "../src/types";
import { isUser, UserSchema } from "../src/validators/valibot";

describe("Valibot validator", () => {
  it.each(fixtures)("$name -> $expected", ({ input, expected }) => {
    expect(isUser(input)).toBe(expected);
  });

  it("narrows unknown to User", () => {
    const input: unknown = validUser();
    if (!isUser(input)) throw new Error("expected a valid user");
    expectTypeOf(input).toEqualTypeOf<User>();
    expect(input.profile.active).toBe(true);
  });

  it("reports the path of the field that failed", () => {
    const result = v.safeParse(UserSchema, { ...validUser(), age: 17 });
    expect(result.success).toBe(false);
    const issue = result.issues?.[0];
    expect(issue && v.getDotPath(issue)).toBe("age");
  });

  it("names the unexpected key", () => {
    const result = v.safeParse(UserSchema, { ...validUser(), email: "ada@example.com" });
    const issue = result.issues?.[0];
    expect(issue && v.getDotPath(issue)).toBe("email");
  });
});
