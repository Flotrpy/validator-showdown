import { spawnSync } from "node:child_process";
import pc from "picocolors";
import { ROOT } from "./lib/files";

/**
 * Runs every check in order and stops at the first failure.
 * Uses Node instead of `&&` chains so it behaves the same in PowerShell,
 * cmd, bash, and zsh.
 */
const steps = ["lint", "typecheck", "test", "compare"] as const;

for (const [index, step] of steps.entries()) {
  console.log(pc.bold(pc.cyan(`\n[${index + 1}/${steps.length}] npm run ${step}`)));
  const started = performance.now();
  // A single command string with shell: true finds npm.cmd on Windows too.
  const result = spawnSync(`npm run ${step}`, { cwd: ROOT, stdio: "inherit", shell: true });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);

  if (result.status !== 0) {
    console.error(pc.red(pc.bold(`\nverify failed at "${step}" after ${seconds}s.`)));
    process.exit(result.status ?? 1);
  }
  console.log(pc.green(`${step} passed in ${seconds}s`));
}

console.log(pc.green(pc.bold(`\nAll ${steps.length} checks passed: ${steps.join(", ")}.`)));
