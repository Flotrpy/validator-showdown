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
<!-- checks-badge:start -->
[![checks](https://img.shields.io/badge/checks-123%2F123%20passed-brightgreen)](results/RESULTS.md)
<!-- checks-badge:end -->
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

## Same rules, different behavior: the emoji problem

"Name must be at most 100 characters" sounds like one rule. It is actually a question: **what is a character?**

JavaScript strings are stored as UTF-16. Most letters take one 16-bit *code unit*, but an emoji like 😀 lives outside that range and takes **two**. `string.length` counts code units:

```ts
"a".length;                    // 1
"😀".length;                   // 2
"😀".repeat(51).length;        // 102  <- over the limit
Array.from("😀".repeat(51)).length; // 51 <- code points
```

My contract says *1-100 UTF-16 code units*, so 51 emoji (102 units) must be **rejected**.

Here is the surprise: **Zod's built-in `z.string().max(100)` counts Unicode code points, not UTF-16 code units.** It sees 51, not 102, and lets the name through. Valibot's `v.maxLength(100)` and my handwritten guard both use `string.length`, see 102, and reject it.

Nothing is "wrong" with Zod here. Counting code points is arguably closer to what a human means by "character". But it is not *my* contract, and if the database column or the other service downstream counts UTF-16 units, those 51 emoji are a bug waiting to happen. Two validators with the "same" rule gave different answers.

The fix is to say exactly what I mean:

```ts
name: z.string().refine((name) => name.length >= 1 && name.length <= 100),
```

`npm run compare` runs this exact case through every length check and records the answers:

<!-- unicode:start -->
The name `"😀".repeat(51)` is **102 UTF-16 code units** but only **51 code points**. The contract says at most 100 UTF-16 code units, so the right answer is *reject*.

| Length check | 51 emoji |
|---|---|
| Handwritten guard (`name.length <= 100`) | rejects ✅ |
| Zod built-in `z.string().max(100)` | accepts ❌ |
| Zod with `.refine()` on `name.length` (used here) | rejects ✅ |
| Valibot built-in `v.maxLength(100)` | rejects ✅ |
| Valibot validator (used here) | rejects ✅ |

Zod's built-in string length counts code points, so `z.string().max(100)` sees 51 and lets it through. JavaScript's `string.length` (used by the handwritten guard and by Valibot's `maxLength`) counts UTF-16 code units and sees 102.
<!-- unicode:end -->

With the refine, all three agree. The two boundary fixtures that catch this are `name 50 emoji` (100 units, valid) and `name 51 emoji` (102 units, invalid), and [`tests/edge-cases.test.ts`](tests/edge-cases.test.ts) pins down Zod's built-in behavior so I find out if it ever changes.

## Test results

Every fixture lives in [`src/fixtures.ts`](src/fixtures.ts) with a name, an input, the expected answer, and a one-line reason. `npm run compare` runs each one through each validator. The tables below are copied from [`results/RESULTS.md`](results/RESULTS.md) by the script, so they always match what the code actually does.

<!-- results:start -->
**123/123 checks passed** (41 fixtures × 3 validators).

Disagreements: **none**. Every validator gave the expected answer on every fixture.

| Group | Fixtures | Handwritten | Zod | Valibot |
|---|---:|:---:|:---:|:---:|
| valid | 3 | ✅ 3/3 | ✅ 3/3 | ✅ 3/3 |
| age | 5 | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 |
| name | 4 | ✅ 4/4 | ✅ 4/4 | ✅ 4/4 |
| emoji | 2 | ✅ 2/2 | ✅ 2/2 | ✅ 2/2 |
| types | 7 | ✅ 7/7 | ✅ 7/7 | ✅ 7/7 |
| missing | 4 | ✅ 4/4 | ✅ 4/4 | ✅ 4/4 |
| role | 3 | ✅ 3/3 | ✅ 3/3 | ✅ 3/3 |
| tags | 3 | ✅ 3/3 | ✅ 3/3 | ✅ 3/3 |
| extra-keys | 4 | ✅ 4/4 | ✅ 4/4 | ✅ 4/4 |
| non-object | 6 | ✅ 6/6 | ✅ 6/6 | ✅ 6/6 |

<details>
<summary>Every fixture (41 rows)</summary>

| # | Fixture | Expected | Handwritten | Zod | Valibot | Why |
|---|---|---|:---:|:---:|:---:|---|
| 1 | valid admin | valid | ✅ | ✅ | ✅ | Every field is present, has the right type, and is in range. |
| 2 | valid user, no tags | valid | ✅ | ✅ | ✅ | An empty tags array is still an array of strings. |
| 3 | valid user, empty bio | valid | ✅ | ✅ | ✅ | bio has no length rule, and active may be false. |
| 4 | age 17 | invalid | ✅ | ✅ | ✅ | One below the minimum age of 18. |
| 5 | age 18 | valid | ✅ | ✅ | ✅ | Exactly the minimum age, which is inclusive. |
| 6 | age 120 | valid | ✅ | ✅ | ✅ | Exactly the maximum age, which is inclusive. |
| 7 | age 121 | invalid | ✅ | ✅ | ✅ | One above the maximum age of 120. |
| 8 | age 18.5 | invalid | ✅ | ✅ | ✅ | In range, but not an integer. |
| 9 | name empty | invalid | ✅ | ✅ | ✅ | 0 code units is below the minimum of 1. |
| 10 | name 1 char | valid | ✅ | ✅ | ✅ | 1 code unit is exactly the minimum. |
| 11 | name 100 chars | valid | ✅ | ✅ | ✅ | 100 code units is exactly the maximum. |
| 12 | name 101 chars | invalid | ✅ | ✅ | ✅ | 101 code units is one over the maximum. |
| 13 | name 50 emoji | valid | ✅ | ✅ | ✅ | Each 😀 is 2 UTF-16 code units, so 50 of them is exactly 100. |
| 14 | name 51 emoji | invalid | ✅ | ✅ | ✅ | 51 emoji is only 51 code points but 102 UTF-16 code units, over the limit. |
| 15 | age as string | invalid | ✅ | ✅ | ✅ | No coercion: the string "25" is not the number 25. |
| 16 | id as number | invalid | ✅ | ✅ | ✅ | id must be a string. |
| 17 | name as number | invalid | ✅ | ✅ | ✅ | name must be a string. |
| 18 | tags as string | invalid | ✅ | ✅ | ✅ | tags must be an array, not a single string. |
| 19 | active as string | invalid | ✅ | ✅ | ✅ | No coercion: the string "true" is not the boolean true. |
| 20 | profile as null | invalid | ✅ | ✅ | ✅ | profile must be an object, and null is not one. |
| 21 | profile as array | invalid | ✅ | ✅ | ✅ | profile must be a plain object, not an array. |
| 22 | missing id | invalid | ✅ | ✅ | ✅ | Every field is required, including id. |
| 23 | missing profile | invalid | ✅ | ✅ | ✅ | The whole profile object is required. |
| 24 | missing profile.bio | invalid | ✅ | ✅ | ✅ | Nested fields are required too. |
| 25 | empty object | invalid | ✅ | ✅ | ✅ | An object with no fields is missing all of them. |
| 26 | role superadmin | invalid | ✅ | ✅ | ✅ | Only "admin" and "user" are allowed. |
| 27 | role Admin | invalid | ✅ | ✅ | ✅ | Roles are case-sensitive. |
| 28 | role empty | invalid | ✅ | ✅ | ✅ | An empty string is not a role. |
| 29 | tag is number | invalid | ✅ | ✅ | ✅ | Every tag must be a string, and 7 is a number. |
| 30 | tag is null | invalid | ✅ | ✅ | ✅ | null is not a string. |
| 31 | tag is nested array | invalid | ✅ | ✅ | ✅ | tags is a flat array of strings, not an array of arrays. |
| 32 | extra root key | invalid | ✅ | ✅ | ✅ | email is not part of User, and extra root keys are rejected. |
| 33 | extra profile key | invalid | ✅ | ✅ | ✅ | Extra keys inside profile are rejected too. |
| 34 | extra toString key | invalid | ✅ | ✅ | ✅ | toString is a real own key here, not the one inherited from Object.prototype. |
| 35 | extra \_\_proto\_\_ key | invalid | ✅ | ✅ | ✅ | JSON.parse creates \_\_proto\_\_ as an ordinary own key, so it counts as extra. |
| 36 | null | invalid | ✅ | ✅ | ✅ | typeof null is "object", but null is not a user. |
| 37 | empty array | invalid | ✅ | ✅ | ✅ | Arrays are objects in JavaScript, but not users. |
| 38 | array of a user | invalid | ✅ | ✅ | ✅ | A list containing a valid user is still a list. |
| 39 | string | invalid | ✅ | ✅ | ✅ | A string is not an object. |
| 40 | number | invalid | ✅ | ✅ | ✅ | A number is not an object. |
| 41 | boolean | invalid | ✅ | ✅ | ✅ | A boolean is not an object. |

</details>
<!-- results:end -->

On top of the shared fixtures, Vitest runs six test files: one per validator, a cross-validator agreement test, an edge-case file (boundaries, emoji, extra keys), and a test that every validator leaves its input untouched (deep-equal before and after, and still works on a deeply frozen copy).

## Bundle size

What does each `isUser` cost in a browser bundle? `npm run bundle` builds each validator on its own with esbuild (browser, ESM, minified), then gzips and Brotli-compresses it.

<!-- bundle:start -->
| Validator | Minified | Gzip | Brotli |
|---|---:|---:|---:|
| Handwritten | 832 B | 434 B | 379 B |
| Zod | 90.6 kB | 26.5 kB | 23.5 kB |
| Valibot | 5.8 kB | 1.9 kB | 1.7 kB |
<!-- bundle:end -->

> **This measures standalone cost only.** Each row is one schema and nothing else. In a real app you pay for the library once and every extra schema is cheap, so do not read this as "Zod costs 26 kB per form".

## Runtime benchmark

`npm run bench` calls each `isUser` in a loop: a warmup phase, then repeated samples, reporting the **median nanoseconds per call** (lower is faster).

<!-- bench:start -->
| Validator | Valid input (median) | Invalid input (median) |
|---|---:|---:|
| Handwritten | 172.2 ns | 79.4 ns |
| Zod | 612.3 ns | 1,635 ns |
| Valibot | 1,435.3 ns | 765.6 ns |

Node v22.22.0 on linux/x64 (Intel(R) Xeon(R) Processor @ 2.80GHz). 50,000 warmup calls, then 25 samples of 20,000 calls each, cycling through the 8 valid and 33 invalid fixtures.
<!-- bench:end -->

> ⚠️ **This is a microbenchmark, not a universal ranking.** It is one small schema, on one machine, on one Node version. CPU, JIT warmup, input shape, and library versions all move these numbers. Every one of these is well under a few microseconds per call, which is fast enough for almost any app. Run it on your own machine before you believe it.
