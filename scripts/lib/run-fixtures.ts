import { fixtures, type FixtureGroup } from "../../src/fixtures";
import { validators } from "../../src/validators";

export interface FixtureResult {
  name: string;
  group: FixtureGroup;
  input: unknown;
  expected: boolean;
  why: string;
  /** What each validator returned, keyed by validator name. */
  actual: Record<string, boolean>;
  /** Validators whose answer did not match `expected`. */
  failedBy: string[];
  /** True when the validators gave different answers from each other. */
  disagreement: boolean;
}

export interface ComparisonSummary {
  fixtures: number;
  validators: number;
  checks: number;
  passed: number;
  failed: number;
  disagreements: number;
}

export interface Comparison {
  validators: string[];
  fixtures: FixtureResult[];
  summary: ComparisonSummary;
}

/** Runs every fixture through every validator. */
export function runFixtures(): Comparison {
  const results = fixtures.map((fixture): FixtureResult => {
    const actual = Object.fromEntries(validators.map((v) => [v.name, v.isUser(fixture.input)]));
    const answers = new Set(Object.values(actual));
    return {
      name: fixture.name,
      group: fixture.group,
      input: fixture.input,
      expected: fixture.expected,
      why: fixture.why,
      actual,
      failedBy: validators.filter((v) => actual[v.name] !== fixture.expected).map((v) => v.name),
      disagreement: answers.size > 1,
    };
  });

  const checks = results.length * validators.length;
  const failed = results.reduce((sum, result) => sum + result.failedBy.length, 0);

  return {
    validators: validators.map((v) => v.name),
    fixtures: results,
    summary: {
      fixtures: results.length,
      validators: validators.length,
      checks,
      passed: checks - failed,
      failed,
      disagreements: results.filter((result) => result.disagreement).length,
    },
  };
}
