# lsm-recovery-version-api-js

Monorepo (npm workspaces) for two independent, independently-versioned
packages built for the [LSM Text Only Holy Bible Recovery Version
API](https://api.lsm.org/recver/txo-docs.htm):

- **[`packages/api-client`](packages/api-client)** — [`@syall/lsm-recovery-version-api-js`](https://www.npmjs.com/package/@syall/lsm-recovery-version-api-js):
  a TypeScript client for the API itself.
- **[`packages/verse-reference-builder`](packages/verse-reference-builder)** — [`@syall/verse-reference-builder`](https://www.npmjs.com/package/@syall/verse-reference-builder):
  a type-safe (and dynamic/runtime-checked) builder for the API's
  verse-reference string grammar. Has no dependency on the API client
  and no runtime dependencies of its own — usable entirely on its own,
  e.g. to build a reference string for display without ever calling
  the API.

The two packages have **no dependency on each other**. Pair them
yourself by calling `.build()` on a `VerseReferenceBuilder` and passing
the result to `getVerses({ string })` — see the api-client package's
README for an example.

This root `package.json` is private and is never published; each
package under `packages/` publishes independently to npm, with its own
`README.md`, `CHANGELOG.md`, and version number (managed by
[Changesets](https://github.com/changesets/changesets) — see
`.changeset/README.md`).

## Development

```bash
npm install                # installs and links both workspaces
npm run typecheck          # both packages
npm test                   # both packages
npm run build              # both packages
npm run test:browser       # both packages, in a real headless browser
npm run test:runtime:bun   # both packages, under Bun (requires Bun installed)
npm run test:runtime:deno  # both packages, under Deno (requires Deno installed)
```

Each command above runs across both workspaces via `npm run <script>
--workspaces --if-present`. To run a script for just one package, either
`cd` into it (`packages/api-client` or `packages/verse-reference-builder`)
and run its own `npm run <script>`, or use `npm run <script>
--workspace=packages/<name>` from the root.

### Shared tooling

- `tsconfig.base.json` — compiler options common to both packages;
  each package's own `tsconfig.build.json` extends it.
- `scripts/` — build and test scripts shared by both packages
  (`build-umd.mjs`, `write-dist-manifests.mjs`, `test-browser.mjs`,
  `smoke-test-esm.mjs`). Each operates relative to whichever package
  directory `npm run` was invoked from; anything genuinely
  package-specific (the browser/runtime smoke-test *scenarios*) lives
  in that package's own `test/browser-smoke.mjs` / `test/runtime-smoke.mjs`
  instead — see the comments at the top of each shared script for the
  exact contract.
### CI

`.github/workflows/ci.yml` runs both packages' builds and test suites
across a Node 20/22/24 × 3-OS matrix, a separate browser job
(chromium/firefox/webkit × 3-OS), and separate Bun/Deno runtime jobs.
See each package's own README for the full breakdown.

### Releasing

Each package versions and publishes independently via Changesets:

```bash
npx changeset             # records a change against one or both packages
npm run version-packages  # (changeset version) applies pending changesets, commit, push to main
```

Publishing to npm is then automated: dispatch the "Publish" GitHub
Actions workflow (`.github/workflows/publish.yml` — Actions tab →
Publish → Run workflow). It builds, tests, and publishes whichever
package(s) have a pending version bump via npm Trusted Publishing (OIDC
— no token needed), pushes the release tag(s), and opens a matching
GitHub Release per package. The run itself still requires a
required-reviewer approval on the `npm-publish` environment before
anything actually publishes.
