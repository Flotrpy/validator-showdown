import { describe, expect, expectTypeOf, it } from "vitest";
import { fixtures, validUser } from "../src/fixtures";
import type { User } from "../src/types";
import { isUser, UserSchema } from "../src/validators/zod";

describe("Zod validator", () => {
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
    const result = UserSchema.safeParse({ ...validUser(), age: 17 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["age"]);
  });

  it("names the unexpected key", () => {
    const result = UserSchema.safeParse({ ...validUser(), email: "ada@example.com" });
    expect(result.error?.issues[0]).toMatchObject({ code: "unrecognized_keys", keys: ["email"] });
  });
});
