import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { build, version as esbuildVersion } from "esbuild";
import { validators } from "../../src/validators";
import { ROOT } from "./files";

export interface BundleResult {
  validator: string;
  /** Minified bytes. */
  minified: number;
  /** Bytes after gzip (level 9). */
  gzip: number;
  /** Bytes after Brotli (quality 11). */
  brotli: number;
}

export interface BundleReport {
  esbuild: string;
  settings: string;
  results: BundleResult[];
}

const SETTINGS = "bundle, platform=browser, format=esm, minify, target=es2022";

/** Bundles one validator on its own, as if it were the only thing in an app. */
async function measure(name: string, file: string): Promise<BundleResult> {
  const output = await build({
    stdin: {
      // Import only isUser, the same way an app would.
      contents: `export { isUser } from "./${file}";`,
      resolveDir: ROOT,
      loader: "ts",
    },
    bundle: true,
    platform: "browser",
    format: "esm",
    minify: true,
    target: "es2022",
    write: false,
    logLevel: "silent",
  });

  const code = output.outputFiles[0]?.contents;
  if (!code) throw new Error(`esbuild produced no output for ${name}`);

  return {
    validator: name,
    minified: code.byteLength,
    gzip: gzipSync(code, { level: 9 }).byteLength,
    brotli: brotliCompressSync(code, {
      params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY },
    }).byteLength,
  };
}

export async function measureBundles(): Promise<BundleReport> {
  const results: BundleResult[] = [];
  for (const validator of validators) {
    results.push(await measure(validator.name, validator.file));
  }
  return { esbuild: esbuildVersion, settings: SETTINGS, results };
}
