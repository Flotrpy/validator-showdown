import { RULES, type User } from "../types";

const USER_KEYS = ["id", "name", "age", "role", "tags", "profile"] as const;
const PROFILE_KEYS = ["bio", "active"] as const;

/** True for `{}`-style objects. Rejects null and arrays, which are also "object". */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True when the object has exactly these own keys: none missing, none extra. */
function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isValidName(value: unknown): value is string {
  // string.length counts UTF-16 code units, which is the contract.
  return (
    typeof value === "string" &&
    value.length >= RULES.nameMinLength &&
    value.length <= RULES.nameMaxLength
  );
}

function isValidAge(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= RULES.minAge &&
    value <= RULES.maxAge
  );
}

function isValidRole(value: unknown): value is User["role"] {
  return value === "admin" || value === "user";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidProfile(value: unknown): value is User["profile"] {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, PROFILE_KEYS) &&
    typeof value.bio === "string" &&
    typeof value.active === "boolean"
  );
}

/** Handwritten type guard: plain TypeScript, no library. */
export function isUser(input: unknown): input is User {
  if (!isPlainObject(input) || !hasExactKeys(input, USER_KEYS)) {
    return false;
  }

  return (
    typeof input.id === "string" &&
    isValidName(input.name) &&
    isValidAge(input.age) &&
    isValidRole(input.role) &&
    isStringArray(input.tags) &&
    isValidProfile(input.profile)
  );
}
