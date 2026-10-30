import pc from "picocolors";
import { runBenchmark } from "./lib/benchmark";
import { relativeToRoot, resultsPath, writeJson } from "./lib/files";
import { BENCH_DISCLAIMER, formatNs, writeReports } from "./lib/report";
import { renderTable } from "./lib/table";

console.log(pc.bold("\nRuntime microbenchmark (median ns per call, lower is faster)\n"));
console.log(pc.dim("Running... this takes a few seconds.\n"));

const report = runBenchmark();
const jsonPath = resultsPath("bench.json");
writeJson(jsonPath, report);
writeReports();

console.log(
  renderTable(
    ["Validator", "Valid input", "Invalid input"],
    report.results.map((r) => [r.validator, formatNs(r.validNs), formatNs(r.invalidNs)]),
  ),
);
const { node, platform, arch, cpu } = report.environment;
console.log(pc.dim(`\nNode ${node} on ${platform}/${arch}, ${cpu}`));
console.log(pc.yellow(`\n${BENCH_DISCLAIMER}`));
console.log(pc.dim(`Saved to ${relativeToRoot(jsonPath)}`));
