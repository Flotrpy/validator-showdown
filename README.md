<div align="center">

# ⚔️ Validator Showdown

**Same data. Same rules. Three validators. One of them almost lets 102 characters through a 100-character limit.**

A handwritten type guard vs Zod vs Valibot, run side by side on the same fixtures, with pass/fail results, bundle sizes, and a runtime benchmark.

[![CI](https://github.com/Flotrpy/validator-showdown/actions/workflows/ci.yml/badge.svg)](https://github.com/Flotrpy/validator-showdown/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![Node](https://img.shields.io/badge/node-%3E%3D20.19-339933?logo=node.js&logoColor=white)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
<br>
[![Zod](https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white)](https://zod.dev)
[![Valibot](https://img.shields.io/badge/Valibot-1-F5A623)](https://valibot.dev)
[![Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![Windows | macOS | Linux](https://img.shields.io/badge/runs%20on-Windows%20%7C%20macOS%20%7C%20Linux-informational)](.github/workflows/ci.yml)

</div>

---

## The problem: TypeScript types vanish at runtime

TypeScript checks your code, not your data. This compiles without a single warning:

```ts
interface User {
  name: string;
  age: number;
}

const user = JSON.parse('{"name": 42, "age": "old"}') as User;
user.name.toUpperCase(); // 💥 TypeError at runtime
```

After compilation, `interface User` is gone. The JavaScript that actually runs has no idea what a `User` is. Anything that crosses a boundary (an API response, a form, a file, `localStorage`) is `unknown` until something checks it at runtime.

So I wrote that check three ways and made them fight over the same 41 fixtures.

### The contract

```ts
interface User {
  id: string;
  name: string;            // 1-100 UTF-16 code units
  age: number;             // integer, 18-120
  role: "admin" | "user";
  tags: string[];
  profile: { bio: string; active: boolean };
}
```

- Extra keys are rejected, at the root and inside `profile`.
- No coercion: the string `"25"` is not a valid age.
- Input is ordinary JSON-decoded data.

Every validator exports the same function: `isUser(input: unknown): input is User`.

## The three contenders

### 1. Handwritten type guard: no library

Plain TypeScript. Every rule is an `if` I wrote myself. [`src/validators/handwritten.ts`](src/validators/handwritten.ts)

```ts
export function isUser(input: unknown): input is User {
  if (!isPlainObject(input) || !hasExactKeys(input, USER_KEYS)) return false;

  return (
    typeof input.id === "string" &&
    isValidName(input.name) &&        // typeof string, 1 <= length <= 100
    isValidAge(input.age) &&          // Number.isInteger, 18-120
    isValidRole(input.role) &&
    isStringArray(input.tags) &&
    isValidProfile(input.profile)     // exact keys, bio string, active boolean
  );
}
```

Zero dependencies, nothing to learn. The catch: the `User` interface and the guard are two separate things, and nothing but tests keeps them in sync.

### 2. Zod: `z.strictObject`

The schema is the source of truth, and the type can be inferred from it. [`src/validators/zod.ts`](src/validators/zod.ts)

```ts
import * as z from "zod";

export const UserSchema = z.strictObject({
  id: z.string(),
  name: z.string().refine((name) => name.length >= 1 && name.length <= 100),
  age: z.int().min(18).max(120),
  role: z.enum(["admin", "user"]),
  tags: z.array(z.string()),
  profile: z.strictObject({ bio: z.string(), active: z.boolean() }),
});

export function isUser(input: unknown): input is User {
  return UserSchema.safeParse(input).success;
}
```

Why `.refine()` instead of `.min(1).max(100)`? That is the whole next section.

### 3. Valibot: `v.strictObject` + `v.is()`

Same idea as Zod, but built from small functions you pipe together. [`src/validators/valibot.ts`](src/validators/valibot.ts)

```ts
import * as v from "valibot";

export const UserSchema = v.strictObject({
  id: v.string(),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  age: v.pipe(v.number(), v.integer(), v.minValue(18), v.maxValue(120)),
  role: v.picklist(["admin", "user"]),
  tags: v.array(v.string()),
  profile: v.strictObject({ bio: v.string(), active: v.boolean() }),
});

export function isUser(input: unknown): input is User {
  return v.is(UserSchema, input);
}
```

Both schemas also carry a compile-time check, `Expect<Equal<z.infer<typeof UserSchema>, User>>`, so `npm run typecheck` fails if a schema drifts away from the `User` type.
