// Bundles a package's src/index.ts into a single, dependency-free,
// browser-ready global-variable ("UMD-style" script-tag) build under
// that package's dist/umd — for consumers with no bundler at all, a
// plain <script src="..."> tag. Not needed for Node/bundler consumers,
// who get dist/esm or dist/cjs via package.json's "exports" instead.
//
// Shared across every package in this monorepo: it operates entirely
// relative to process.cwd() (the package directory `npm run` was
// invoked from — each package's own package.json calls this via
// "node ../../scripts/build-umd.mjs") and reads the two
// package-specific bits it needs from that package's own package.json:
// "name" (for the output file's basename) and "umdName" (the
// window/globalThis global the bundle exposes).
import { build } from "esbuild";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));

const globalName = pkg.umdName;
if (!globalName) {
  throw new Error(`${pkg.name}'s package.json is missing the "umdName" field the UMD build needs.`);
}
const basename = pkg.name.replace(/^@[^/]+\//, "");

const outDir = join(root, "dist", "umd");
mkdirSync(outDir, { recursive: true });

const shared = {
  entryPoints: [join(root, "src", "index.ts")],
  bundle: true,
  format: "iife",
  globalName,
  platform: "browser",
  target: ["es2017"],
  sourcemap: true,
  logLevel: "info",
};

await build({
  ...shared,
  outfile: join(outDir, `${basename}.js`),
});

await build({
  ...shared,
  outfile: join(outDir, `${basename}.min.js`),
  minify: true,
});
