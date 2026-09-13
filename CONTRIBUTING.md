# Contributing

Thanks for considering a contribution to this monorepo! It contains
two independent, independently-versioned packages:

- [`packages/api-client`](packages/api-client) — `@syall/lsm-recovery-version-api-js`
- [`packages/verse-reference-builder`](packages/verse-reference-builder) — `@syall/verse-reference-builder`

## Getting set up

```bash
npm install                # installs and links both workspaces
npm run typecheck          # both packages
npm test                   # both packages (includes typecheck via "pretest")
npm run build              # both packages (ESM + CommonJS + browser UMD)
```

To work on just one package, either `cd` into it and use its own
`npm run <script>`, or run `npm run <script> --workspace=packages/<name>`
from the repo root.

### Additional checks

These require extra runtimes/browsers installed locally, and also run
in CI, so they're optional while iterating:

```bash
npm run test:browser       # chromium/firefox/webkit, via the UMD bundle
npm run test:runtime:bun   # requires Bun installed
npm run test:runtime:deno  # requires Deno installed
```

## Making a change

1. Fork the repo and create a branch off `main`.
2. Make your change, with tests, in the relevant package(s).
3. Run `npm test` and `npm run build` for any package you touched.
4. Add a changeset describing the change:
   ```bash
   npx changeset
   ```
   Pick the package(s) affected and a semver bump (patch/minor/major)
   for each. This produces a markdown file under `.changeset/` — commit
   it alongside your code change. See [`.changeset/README.md`](.changeset/README.md)
   for more on how Changesets works.
5. Open a pull request. CI (`.github/workflows/ci.yml`) runs the test
   and build matrix (Node 20/22/24 × Linux/macOS/Windows), a browser
   smoke test (chromium/firefox/webkit), and Bun/Deno runtime smoke
   tests.

## Releasing

Maintainers only — see [`README.md`](README.md#releasing) for the
release process (Changesets version bump + `npm publish` per changed
package).

## Code style

- TypeScript, strict mode (see `tsconfig.base.json`).
- No runtime dependencies in `verse-reference-builder`; keep it that
  way unless there's a strong reason.
- Match the existing test style in the package you're editing
  (`test/*.test.ts`, plus `test/browser-smoke.mjs` /
  `test/runtime-smoke.mjs` for the cross-platform smoke tests).

## Reporting bugs / requesting features

Please use the issue templates when opening a GitHub issue — they help
make sure reports include what's needed to reproduce or evaluate them.
For security vulnerabilities, see [`SECURITY.md`](SECURITY.md) instead
of opening a public issue.
