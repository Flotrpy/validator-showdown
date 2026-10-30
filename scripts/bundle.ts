import pc from "picocolors";
import { formatBytes, measureBundles } from "./lib/bundle-size";
import { relativeToRoot, resultsPath, writeJson } from "./lib/files";
import { renderTable } from "./lib/table";

const report = await measureBundles();
const jsonPath = resultsPath("bundle.json");
writeJson(jsonPath, report);

console.log(pc.bold("\nBundle size per validator (standalone)\n"));
console.log(pc.dim(`${report.settings}, esbuild ${report.esbuild}\n`));
console.log(
  renderTable(
    ["Validator", "Minified", "Gzip", "Brotli"],
    report.results.map((r) => [r.validator, formatBytes(r.minified), formatBytes(r.gzip), formatBytes(r.brotli)]),
  ),
);
console.log(pc.dim("\nThis is the cost of one schema on its own. Real apps share the library across schemas."));
console.log(pc.dim(`Saved to ${relativeToRoot(jsonPath)}`));
