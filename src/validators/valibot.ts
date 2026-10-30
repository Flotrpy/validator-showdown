import * as v from "valibot";
import { RULES, type User } from "../types";
import type { Equal, Expect } from "../type-utils";

export const UserSchema = v.strictObject({
  id: v.string(),
  // Valibot's minLength/maxLength use string.length (UTF-16 code units),
  // which already matches the contract.
  name: v.pipe(v.string(), v.minLength(RULES.nameMinLength), v.maxLength(RULES.nameMaxLength)),
  age: v.pipe(v.number(), v.integer(), v.minValue(RULES.minAge), v.maxValue(RULES.maxAge)),
  role: v.picklist(RULES.roles),
  tags: v.array(v.string()),
  profile: v.strictObject({
    bio: v.string(),
    active: v.boolean(),
  }),
});

/** Fails `npm run typecheck` if the schema drifts away from the User type. */
export type ValibotSchemaMatchesUser = Expect<Equal<v.InferOutput<typeof UserSchema>, User>>;

/** Valibot validator: v.strictObject plus v.is(). */
export function isUser(input: unknown): input is User {
  return v.is(UserSchema, input);
}
