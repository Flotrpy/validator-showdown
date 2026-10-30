import os from "node:os";
import { fixtures } from "../../src/fixtures";
import { validators, type Validator } from "../../src/validators";

export const BENCH_SETTINGS = {
  warmupCalls: 50_000,
  samples: 25,
  callsPerSample: 20_000,
} as const;

export interface BenchResult {
  validator: string;
  /** Median nanoseconds per call on valid inputs. */
  validNs: number;
  /** Median nanoseconds per call on invalid inputs. */
  invalidNs: number;
}

export interface BenchReport {
  environment: { node: string; platform: string; arch: string; cpu: string };
  settings: typeof BENCH_SETTINGS;
  inputs: { valid: number; invalid: number };
  results: BenchResult[];
}

const validInputs = fixtures.filter((f) => f.expected).map((f) => f.input);
const invalidInputs = fixtures.filter((f) => !f.expected).map((f) => f.input);

/** Counts true results so the JIT cannot skip the calls as dead code. */
let sink = 0;

function runBatch(validator: Validator, inputs: readonly unknown[], calls: number): void {
  for (let i = 0; i < calls; i++) {
    if (validator.isUser(inputs[i % inputs.length])) sink++;
  }
}

function timeBatch(validator: Validator, inputs: readonly unknown[]): number {
  const start = process.hrtime.bigint();
  runBatch(validator, inputs, BENCH_SETTINGS.callsPerSample);
  const elapsed = process.hrtime.bigint() - start;
  return Number(elapsed) / BENCH_SETTINGS.callsPerSample;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0);
  return Math.round(value * 10) / 10;
}

export function runBenchmark(): BenchReport {
  for (const validator of validators) {
    runBatch(validator, validInputs, BENCH_SETTINGS.warmupCalls);
    runBatch(validator, invalidInputs, BENCH_SETTINGS.warmupCalls);
  }

  const samples = new Map(validators.map((v) => [v.name, { valid: [] as number[], invalid: [] as number[] }]));
  for (let s = 0; s < BENCH_SETTINGS.samples; s++) {
    // Interleave validators so slow drift (CPU heat, GC) hits all of them equally.
    for (const validator of validators) {
      const entry = samples.get(validator.name);
      entry?.valid.push(timeBatch(validator, validInputs));
      entry?.invalid.push(timeBatch(validator, invalidInputs));
    }
  }

  if (sink < 0) console.log(sink);

  return {
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: os.cpus()[0]?.model.trim() ?? "unknown",
    },
    settings: BENCH_SETTINGS,
    inputs: { valid: validInputs.length, invalid: invalidInputs.length },
    results: validators.map((v) => ({
      validator: v.name,
      validNs: median(samples.get(v.name)?.valid ?? []),
      invalidNs: median(samples.get(v.name)?.invalid ?? []),
    })),
  };
}
