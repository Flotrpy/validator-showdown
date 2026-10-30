import * as v from "valibot";
import * as z from "zod";
import { validUser } from "../../src/fixtures";
import { isUser as handwritten } from "../../src/validators/handwritten";
import { isUser as valibot } from "../../src/validators/valibot";
import { isUser as zod } from "../../src/validators/zod";

export interface UnicodeDemoRow {
  check: string;
  accepts: boolean;
}

export interface UnicodeDemo {
  name: string;
  utf16Units: number;
  codePoints: number;
  rows: UnicodeDemoRow[];
}

/**
 * Runs the 51-emoji name through each length check, including Zod's built-in
 * .max(100) that this project deliberately does not use.
 */
export function runUnicodeDemo(): UnicodeDemo {
  const name = "😀".repeat(51);
  const user = { ...validUser(), name };

  return {
    name: '`"😀".repeat(51)`',
    utf16Units: name.length,
    codePoints: Array.from(name).length,
    rows: [
      { check: "Handwritten guard (`name.length <= 100`)", accepts: handwritten(user) },
      { check: "Zod built-in `z.string().max(100)`", accepts: z.string().max(100).safeParse(name).success },
      { check: "Zod with `.refine()` on `name.length` (used here)", accepts: zod(user) },
      { check: "Valibot built-in `v.maxLength(100)`", accepts: v.is(v.pipe(v.string(), v.maxLength(100)), name) },
      { check: "Valibot validator (used here)", accepts: valibot(user) },
    ],
  };
}
