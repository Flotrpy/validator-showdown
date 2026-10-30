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

export const fixtures: readonly Fixture[] = [...valid];
