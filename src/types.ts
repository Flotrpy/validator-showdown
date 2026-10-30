/**
 * The one shape every validator in this project checks for.
 *
 * Rules that the type system cannot express on its own:
 * - name: 1 to 100 UTF-16 code units (that is what `string.length` counts)
 * - age: an integer from 18 to 120
 * - no extra keys at the root or inside `profile`
 * - no coercion: the string "25" is not a valid age
 */
export interface User {
  id: string;
  name: string;
  age: number;
  role: "admin" | "user";
  tags: string[];
  profile: {
    bio: string;
    active: boolean;
  };
}

/** The limits shared by all three validators. */
export const RULES = {
  nameMinLength: 1,
  nameMaxLength: 100,
  minAge: 18,
  maxAge: 120,
  roles: ["admin", "user"],
} as const;
