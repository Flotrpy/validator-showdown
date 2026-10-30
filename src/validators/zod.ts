import { z } from "zod";
import { RULES, type User } from "../types";
import type { Equal, Expect } from "../type-utils";

export const UserSchema = z.strictObject({
  id: z.string(),
  // Zod's built-in .min()/.max() on strings count Unicode code points, so
  // "😀" counts as 1. The contract counts UTF-16 code units ("😀" is 2), so
  // the length rule is a .refine() on string.length instead.
  name: z
    .string()
    .refine(
      (name) => name.length >= RULES.nameMinLength && name.length <= RULES.nameMaxLength,
      { message: "name must be 1-100 UTF-16 code units" },
    ),
  age: z.int().min(RULES.minAge).max(RULES.maxAge),
  role: z.enum(RULES.roles),
  tags: z.array(z.string()),
  profile: z.strictObject({
    bio: z.string(),
    active: z.boolean(),
  }),
});

/** Fails `npm run typecheck` if the schema drifts away from the User type. */
export type ZodSchemaMatchesUser = Expect<Equal<z.infer<typeof UserSchema>, User>>;

/** Zod validator: z.strictObject plus safeParse. */
export function isUser(input: unknown): input is User {
  return UserSchema.safeParse(input).success;
}
