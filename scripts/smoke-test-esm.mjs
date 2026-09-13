// Runtime-interoperability smoke test harness, shared across every
// package in this monorepo. Delegates to that package's own
// test/runtime-smoke.mjs, which imports the *built* dist/esm output
// (exactly as a real ESM consumer would) and does the package-specific
// assertions — deliberately written with only standard Web/JS APIs (no
// Node-specific imports) so the identical file runs unmodified under
// Node, Bun, and Deno. See the "runtime-bun" / "runtime-deno" CI jobs
// in .github/workflows/ci.yml and each package's README "Runtime
// compatibility" section.
//
// This only needs `npm run build:esm` to have been run first (not the
// full build), since the per-package scenario imports dist/esm
// directly. Operates relative to process.cwd() (the package directory
// `npm run` was invoked from — each package's own package.json calls
// this via "node ../../scripts/smoke-test-esm.mjs").
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));

await import(pathToFileURL(join(root, "test", "runtime-smoke.mjs")).href);

const runtime = globalThis.Bun ? "Bun" : globalThis.Deno ? "Deno" : "Node";
console.log(`Runtime smoke test passed under ${runtime} for ${pkg.name}: dist/esm imported and exercised.`);
