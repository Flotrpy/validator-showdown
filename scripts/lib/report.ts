import type { BenchReport } from "./benchmark";
import type { BundleReport } from "./bundle-size";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readJson, resultsPath, ROOT, writeText } from "./files";
import type { Comparison, FixtureResult } from "./run-fixtures";
import type { UnicodeDemo } from "./unicode-demo";

/** Escapes text for use inside a markdown table cell (pipes, and _ or * that would turn bold). */
function md(text: string): string {
  return text.replace(/[|_*]/g, (char) => `\\${char}`);
}

function mark(result: FixtureResult, validator: string): string {
  return result.actual[validator] === result.expected ? "✅" : "❌";
}

/** Formats a byte count like "1.2 kB" (1 kB = 1000 bytes). */
export function formatBytes(bytes: number): string {
  return bytes < 1000 ? `${bytes} B` : `${(bytes / 1000).toFixed(1)} kB`;
}

/** Formats nanoseconds like "1,234 ns". */
export function formatNs(ns: number): string {
  return `${ns.toLocaleString("en-US", { maximumFractionDigits: 1 })} ns`;
}

export const BENCH_DISCLAIMER =
  "This is a microbenchmark, not a universal ranking. It measures one small schema on one " +
  "machine and one Node version. CPU, JIT warmup, input shape, and library versions all move " +
  "these numbers. Use them to get a feel for the order of magnitude, nothing more.";

export function renderSummary(comparison: Comparison): string {
  const { summary } = comparison;
  return [
    `**${summary.passed}/${summary.checks} checks passed** ` +
      `(${summary.fixtures} fixtures × ${summary.validators} validators).`,
    "",
    summary.disagreements === 0
      ? "Disagreements: **none**. Every validator gave the expected answer on every fixture."
      : `Disagreements: **${summary.disagreements}**. See the section below.`,
  ].join("\n");
}

export function renderDisagreements(comparison: Comparison): string {
  const rows = comparison.fixtures.filter((r) => r.disagreement || r.failedBy.length > 0);
  if (rows.length === 0) {
    return (
      "None. All validators agree with each other and with the expected result on every fixture. " +
      "That agreement is not free: Zod only matches because its name rule is a custom `.refine()`. " +
      "See the next section."
    );
  }
  return rows
    .map((result) => {
      const said = (answer: boolean): string =>
        comparison.validators.filter((v) => result.actual[v] === answer).join(", ") || "nobody";
      return (
        `- **${result.name}**: expected ${result.expected ? "valid" : "invalid"}. ` +
        `Said valid: ${said(true)}. Said invalid: ${said(false)}. Why it matters: ${result.why}`
      );
    })
    .join("\n");
}

export function renderUnicodeDemo(demo: UnicodeDemo): string {
  const rows = demo.rows.map((row) => `| ${row.check} | ${row.accepts ? "accepts ❌" : "rejects ✅"} |`);
  return [
    `The name ${demo.name} is **${demo.utf16Units} UTF-16 code units** but only ` +
      `**${demo.codePoints} code points**. The contract says at most 100 UTF-16 code units, ` +
      "so the right answer is *reject*.",
    "",
    "| Length check | 51 emoji |",
    "|---|---|",
    ...rows,
    "",
    "Zod's built-in string length counts code points, so `z.string().max(100)` sees 51 and lets it " +
      "through. JavaScript's `string.length` (used by the handwritten guard and by Valibot's " +
      "`maxLength`) counts UTF-16 code units and sees 102.",
  ].join("\n");
}

/** One row per fixture group: how many checks each validator passed. */
export function renderGroupTable(comparison: Comparison): string {
  const groups = [...new Set(comparison.fixtures.map((r) => r.group))];
  const rows = groups.map((group) => {
    const inGroup = comparison.fixtures.filter((r) => r.group === group);
    const scores = comparison.validators.map((v) => {
      const passed = inGroup.filter((r) => r.actual[v] === r.expected).length;
      return `${passed === inGroup.length ? "✅" : "❌"} ${passed}/${inGroup.length}`;
    });
    return `| ${group} | ${inGroup.length} | ${scores.join(" | ")} |`;
  });
  return [
    `| Group | Fixtures | ${comparison.validators.join(" | ")} |`,
    `|---|---:|${comparison.validators.map(() => ":---:").join("|")}|`,
    ...rows,
  ].join("\n");
}

export function renderResultsTable(comparison: Comparison): string {
  const header = `| # | Fixture | Expected | ${comparison.validators.join(" | ")} | Why |`;
  const divider = `|---|---|---|${comparison.validators.map(() => ":---:").join("|")}|---|`;
  const rows = comparison.fixtures.map(
    (result, index) =>
      `| ${index + 1} | ${md(result.name)} | ${result.expected ? "valid" : "invalid"} | ` +
      `${comparison.validators.map((v) => mark(result, v)).join(" | ")} | ${md(result.why)} |`,
  );
  return [header, divider, ...rows].join("\n");
}

export function renderBundleTable(report: BundleReport): string {
  const rows = report.results.map(
    (r) =>
      `| ${r.validator} | ${formatBytes(r.minified)} | ${formatBytes(r.gzip)} | ${formatBytes(r.brotli)} |`,
  );
  return ["| Validator | Minified | Gzip | Brotli |", "|---|---:|---:|---:|", ...rows].join("\n");
}

function bundleSection(report: BundleReport | undefined): string[] {
  if (!report) return [];
  return [
    "## Bundle size",
    "",
    renderBundleTable(report),
    "",
    `Measured with esbuild ${report.esbuild} (${report.settings}). Gzip at level 9, Brotli at quality 11.`,
    "",
    "> **Standalone cost only.** Each row bundles one `isUser` and nothing else. In a real app the",
    "> library is paid for once and shared by every schema, so these numbers are not a per-schema cost.",
    "",
  ];
}

export function renderBenchTable(report: BenchReport): string {
  const rows = report.results.map(
    (r) => `| ${r.validator} | ${formatNs(r.validNs)} | ${formatNs(r.invalidNs)} |`,
  );
  return [
    "| Validator | Valid input (median) | Invalid input (median) |",
    "|---|---:|---:|",
    ...rows,
  ].join("\n");
}

export function describeBenchSetup(report: BenchReport): string {
  const { environment: env, settings, inputs } = report;
  return (
    `Node ${env.node} on ${env.platform}/${env.arch} (${env.cpu}). ` +
    `${settings.warmupCalls.toLocaleString("en-US")} warmup calls, then ${settings.samples} samples of ` +
    `${settings.callsPerSample.toLocaleString("en-US")} calls each, cycling through the ` +
    `${inputs.valid} valid and ${inputs.invalid} invalid fixtures.`
  );
}

function benchSection(report: BenchReport | undefined): string[] {
  if (!report) return [];
  return [
    "## Runtime benchmark",
    "",
    renderBenchTable(report),
    "",
    describeBenchSetup(report),
    "",
    `> **${BENCH_DISCLAIMER}**`,
    "",
  ];
}

export interface Reports {
  comparison: Comparison;
  bundle?: BundleReport | undefined;
  bench?: BenchReport | undefined;
}

export function renderResultsMarkdown({ comparison, bundle, bench }: Reports): string {
  return [
    "# Results",
    "",
    "> Generated by `npm run compare`. Do not edit by hand; rerun the script instead.",
    "",
    "## Summary",
    "",
    renderSummary(comparison),
    "",
    "## Disagreements",
    "",
    renderDisagreements(comparison),
    "",
    "## Same rules, different behavior",
    "",
    renderUnicodeDemo(comparison.unicodeDemo),
    "",
    "## Fixture results",
    "",
    "✅ means the validator returned the expected answer. ❌ means it did not.",
    "",
    renderResultsTable(comparison),
    "",
    ...bundleSection(bundle),
    ...benchSection(bench),
  ].join("\n");
}

function checksBadge(comparison: Comparison): string {
  const { passed, checks, failed } = comparison.summary;
  const color = failed === 0 ? "brightgreen" : "red";
  const label = encodeURIComponent(`${passed}/${checks} passed`);
  return `[![checks](https://img.shields.io/badge/checks-${label}-${color})](results/RESULTS.md)`;
}

function readmeResults(comparison: Comparison): string {
  return [
    renderSummary(comparison),
    "",
    renderGroupTable(comparison),
    "",
    "<details>",
    `<summary>Every fixture (${comparison.summary.fixtures} rows)</summary>`,
    "",
    renderResultsTable(comparison),
    "",
    "</details>",
  ].join("\n");
}

function readmeBench(bench: BenchReport): string {
  return [renderBenchTable(bench), "", describeBenchSetup(bench)].join("\n");
}

/** Replaces the text between <!-- name:start --> and <!-- name:end --> markers. */
export function replaceBlock(text: string, name: string, content: string): string {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from === -1 || to === -1 || to < from) return text;
  return `${text.slice(0, from + start.length)}\n${content}\n${text.slice(to)}`;
}

/** Copies the generated tables into README.md so the README never drifts from the results. */
function syncReadme({ comparison, bundle, bench }: Reports): void {
  const readmePath = path.join(ROOT, "README.md");
  if (!existsSync(readmePath)) return;

  let text = readFileSync(readmePath, "utf8").replace(/\r\n/g, "\n");
  text = replaceBlock(text, "checks-badge", checksBadge(comparison));
  text = replaceBlock(text, "unicode", renderUnicodeDemo(comparison.unicodeDemo));
  text = replaceBlock(text, "results", readmeResults(comparison));
  if (bundle) text = replaceBlock(text, "bundle", renderBundleTable(bundle));
  if (bench) text = replaceBlock(text, "bench", readmeBench(bench));
  writeText(readmePath, text);
}

/** Rebuilds results/RESULTS.md and the README tables from the JSON files in results/. */
export function writeReports(): void {
  const comparison = readJson(resultsPath("results.json")) as Comparison | undefined;
  if (!comparison) {
    throw new Error("results/results.json is missing. Run `npm run compare` first.");
  }
  const bundle = readJson(resultsPath("bundle.json")) as BundleReport | undefined;
  const bench = readJson(resultsPath("bench.json")) as BenchReport | undefined;
  writeText(resultsPath("RESULTS.md"), renderResultsMarkdown({ comparison, bundle, bench }));
  syncReadme({ comparison, bundle, bench });
}
