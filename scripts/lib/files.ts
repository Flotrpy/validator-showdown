import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Project root, found from this file's location so scripts work from any folder. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Absolute path to a file inside results/. */
export function resultsPath(fileName: string): string {
  return path.join(ROOT, "results", fileName);
}

/** Writes text with LF line endings, creating the folder if needed. */
export function writeText(filePath: string, text: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, text.replace(/\r\n/g, "\n"), "utf8");
}

export function writeJson(filePath: string, data: unknown): void {
  writeText(filePath, JSON.stringify(data, null, 2) + "\n");
}

/** Reads a JSON file, or returns undefined if it does not exist yet. */
export function readJson(filePath: string): unknown {
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

/** Path relative to the project root, with forward slashes on every OS. */
export function relativeToRoot(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}
