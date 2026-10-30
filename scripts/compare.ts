import pc from "picocolors";
import { renderTable } from "./lib/table";
import { runFixtures, type FixtureResult } from "./lib/run-fixtures";

function cell(result: FixtureResult, validator: string): string {
  const actual = result.actual[validator];
  return actual === result.expected ? pc.green("PASS") : pc.red(`FAIL (got ${String(actual)})`);
}

function note(result: FixtureResult): string {
  if (result.disagreement) return pc.yellow(pc.bold("DISAGREE"));
  if (result.failedBy.length > 0) return pc.red("all wrong");
  return "";
}

const comparison = runFixtures();
const { summary } = comparison;

const headers = ["Fixture", "Expected", ...comparison.validators, "Note"];
const rows = comparison.fixtures.map((result) => [
  result.name,
  result.expected ? "valid" : "invalid",
  ...comparison.validators.map((validator) => cell(result, validator)),
  note(result),
]);

console.log(pc.bold("\nValidator Showdown: every fixture through every validator\n"));
console.log(renderTable(headers, rows));

const allPassed = summary.failed === 0;
const line = `${summary.passed}/${summary.checks} checks passed`;
console.log(
  `\n${allPassed ? pc.green(pc.bold(line)) : pc.red(pc.bold(line))}` +
    pc.dim(` (${summary.fixtures} fixtures x ${summary.validators} validators)`),
);
console.log(
  summary.disagreements === 0
    ? pc.green("No disagreements: all validators gave the same answer on every fixture.")
    : pc.yellow(`${summary.disagreements} fixture(s) where validators disagree. See the DISAGREE rows.`),
);

if (!allPassed) {
  process.exitCode = 1;
}
