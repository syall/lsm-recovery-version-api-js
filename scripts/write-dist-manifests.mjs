// Stamps a minimal package.json into dist/esm and dist/cjs so Node (and
// other runtimes that respect the "type" field) interpret each folder's
// .js files correctly, independent of the package's own root
// package.json's "type" field. Cross-platform (no shell-specific
// commands). Shared across every package in this monorepo — operates
// relative to process.cwd() (the package directory `npm run` was
// invoked from). Run after both tsc builds as part of `npm run build`.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const manifests = {
  esm: { type: "module" },
  cjs: { type: "commonjs" },
};

for (const [dir, contents] of Object.entries(manifests)) {
  const outDir = join(root, "dist", dir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "package.json"), JSON.stringify(contents, null, 2) + "\n");
}
