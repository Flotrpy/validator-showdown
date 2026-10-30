import type { User } from "../types";
import { isUser as handwritten } from "./handwritten";
import { isUser as valibot } from "./valibot";
import { isUser as zod } from "./zod";

export interface Validator {
  /** Short display name used in tables and reports. */
  name: string;
  /** Path of the module, used by the bundle-size script. */
  file: string;
  isUser: (input: unknown) => input is User;
}

/** Every validator under test, in display order. */
export const validators: readonly Validator[] = [
  { name: "Handwritten", file: "src/validators/handwritten.ts", isUser: handwritten },
  { name: "Zod", file: "src/validators/zod.ts", isUser: zod },
  { name: "Valibot", file: "src/validators/valibot.ts", isUser: valibot },
];
