/**
 * Shared fixtures. Every validator runs against every fixture, and every
 * fixture says what the correct answer is and why.
 *
 * Inputs are ordinary JSON-decoded data: objects, arrays, strings, numbers,
 * booleans, and null. No undefined, functions, dates, or class instances.
 */
export interface Fixture {
  /** Short unique name shown in tables. */
  name: string;
  /** Which part of the contract this fixture exercises. */
  group: FixtureGroup;
  /** The value handed to isUser(). */
  input: unknown;
  /** true if the input is a valid User. */
  expected: boolean;
  /** One line of plain English explaining the expected result. */
  why: string;
}

export type FixtureGroup =
  | "valid"
  | "age"
  | "name"
  | "emoji"
  | "types"
  | "missing"
  | "role"
  | "tags"
  | "extra-keys"
  | "non-object";

/** A fresh, valid user every time, so fixtures never share objects. */
export function validUser(): Record<string, unknown> {
  return {
    id: "u_001",
    name: "Ada Lovelace",
    age: 36,
    role: "admin",
    tags: ["math", "engines"],
    profile: { bio: "First programmer.", active: true },
  };
}

/** A valid user with some root fields replaced. */
function userWith(overrides: Record<string, unknown>): Record<string, unknown> {
  return { ...validUser(), ...overrides };
}

/** A valid user with some profile fields replaced. */
function userWithProfile(overrides: Record<string, unknown>): Record<string, unknown> {
  return userWith({ profile: { bio: "First programmer.", active: true, ...overrides } });
}

/** A valid user with one root field removed. */
function userWithout(key: string): Record<string, unknown> {
  const user = validUser();
  // Rebuild without the key instead of using `delete`.
  return Object.fromEntries(Object.entries(user).filter(([k]) => k !== key));
}

const valid: Fixture[] = [
  {
    name: "valid admin",
    group: "valid",
    input: validUser(),
    expected: true,
    why: "Every field is present, has the right type, and is in range.",
  },
  {
    name: "valid user, no tags",
    group: "valid",
    input: userWith({ role: "user", tags: [] }),
    expected: true,
    why: "An empty tags array is still an array of strings.",
  },
  {
    name: "valid user, empty bio",
    group: "valid",
    input: userWithProfile({ bio: "", active: false }),
    expected: true,
    why: "bio has no length rule, and active may be false.",
  },
];

const ageBoundaries: Fixture[] = [
  {
    name: "age 17",
    group: "age",
    input: userWith({ age: 17 }),
    expected: false,
    why: "One below the minimum age of 18.",
  },
  {
    name: "age 18",
    group: "age",
    input: userWith({ age: 18 }),
    expected: true,
    why: "Exactly the minimum age, which is inclusive.",
  },
  {
    name: "age 120",
    group: "age",
    input: userWith({ age: 120 }),
    expected: true,
    why: "Exactly the maximum age, which is inclusive.",
  },
  {
    name: "age 121",
    group: "age",
    input: userWith({ age: 121 }),
    expected: false,
    why: "One above the maximum age of 120.",
  },
  {
    name: "age 18.5",
    group: "age",
    input: userWith({ age: 18.5 }),
    expected: false,
    why: "In range, but not an integer.",
  },
];

const nameBoundaries: Fixture[] = [
  {
    name: "name empty",
    group: "name",
    input: userWith({ name: "" }),
    expected: false,
    why: "0 code units is below the minimum of 1.",
  },
  {
    name: "name 1 char",
    group: "name",
    input: userWith({ name: "A" }),
    expected: true,
    why: "1 code unit is exactly the minimum.",
  },
  {
    name: "name 100 chars",
    group: "name",
    input: userWith({ name: "a".repeat(100) }),
    expected: true,
    why: "100 code units is exactly the maximum.",
  },
  {
    name: "name 101 chars",
    group: "name",
    input: userWith({ name: "a".repeat(101) }),
    expected: false,
    why: "101 code units is one over the maximum.",
  },
];

const emojiLength: Fixture[] = [
  {
    name: "name 50 emoji",
    group: "emoji",
    input: userWith({ name: "😀".repeat(50) }),
    expected: true,
    why: "Each 😀 is 2 UTF-16 code units, so 50 of them is exactly 100.",
  },
  {
    name: "name 51 emoji",
    group: "emoji",
    input: userWith({ name: "😀".repeat(51) }),
    expected: false,
    why: "51 emoji is only 51 code points but 102 UTF-16 code units, over the limit.",
  },
];

const wrongTypes: Fixture[] = [
  {
    name: "age as string",
    group: "types",
    input: userWith({ age: "25" }),
    expected: false,
    why: 'No coercion: the string "25" is not the number 25.',
  },
  {
    name: "id as number",
    group: "types",
    input: userWith({ id: 1 }),
    expected: false,
    why: "id must be a string.",
  },
  {
    name: "name as number",
    group: "types",
    input: userWith({ name: 42 }),
    expected: false,
    why: "name must be a string.",
  },
  {
    name: "tags as string",
    group: "types",
    input: userWith({ tags: "math" }),
    expected: false,
    why: "tags must be an array, not a single string.",
  },
  {
    name: "active as string",
    group: "types",
    input: userWithProfile({ active: "true" }),
    expected: false,
    why: 'No coercion: the string "true" is not the boolean true.',
  },
  {
    name: "profile as null",
    group: "types",
    input: userWith({ profile: null }),
    expected: false,
    why: "profile must be an object, and null is not one.",
  },
  {
    name: "profile as array",
    group: "types",
    input: userWith({ profile: [] }),
    expected: false,
    why: "profile must be a plain object, not an array.",
  },
];

const missingFields: Fixture[] = [
  {
    name: "missing id",
    group: "missing",
    input: userWithout("id"),
    expected: false,
    why: "Every field is required, including id.",
  },
  {
    name: "missing profile",
    group: "missing",
    input: userWithout("profile"),
    expected: false,
    why: "The whole profile object is required.",
  },
  {
    name: "missing profile.bio",
    group: "missing",
    input: userWith({ profile: { active: true } }),
    expected: false,
    why: "Nested fields are required too.",
  },
  {
    name: "empty object",
    group: "missing",
    input: {},
    expected: false,
    why: "An object with no fields is missing all of them.",
  },
];

export const fixtures: readonly Fixture[] = [...valid, ...ageBoundaries, ...nameBoundaries, ...emojiLength, ...wrongTypes, ...missingFields];
