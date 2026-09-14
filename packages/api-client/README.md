# @syall/lsm-recovery-version-api-js

TypeScript client for the LSM Text Only Holy Bible Recovery Version API.

> Looking for the verse-reference string builder? It's a separate,
> independent package: [`@syall/verse-reference-builder`](https://www.npmjs.com/package/@syall/verse-reference-builder)
> ([source](../verse-reference-builder)). This package has no
> dependency on it — see [Building reference strings](#building-reference-strings)
> below.

## Install

```bash
npm install @syall/lsm-recovery-version-api-js
```

Ships both ESM (`import`) and CommonJS (`require`) builds, plus type
declarations for both — works with Node, Bun, Deno, and any bundler
(webpack, esbuild, Vite, Rollup, etc.) targeting either module system.
Node and Bun/Deno compatibility are both verified in CI (see
[Runtime compatibility](#runtime-compatibility) below), not just claimed.

Requires Node 20+ (for global `fetch`), or pass a `fetch` polyfill via
`LsmClientConfig.fetch` for older runtimes or non-Node environments
without a global `fetch` (e.g. via `undici` or `node-fetch`).

```ts
// ESM / TypeScript
import { LsmRecoveryVersionClient } from "@syall/lsm-recovery-version-api-js";
```

```js
// CommonJS
const { LsmRecoveryVersionClient } = require("@syall/lsm-recovery-version-api-js");
```

### Browser `<script>` tag (no bundler)

A dependency-free, minified UMD-style build is also published under
`dist/umd`, exposing a `LsmRecoveryVersionApi` global — usable directly
from a CDN with no build step:

```html
<script src="https://unpkg.com/@syall/lsm-recovery-version-api-js/dist/umd/lsm-recovery-version-api-js.min.js"></script>
<script>
  const { LsmRecoveryVersionClient } = LsmRecoveryVersionApi;

  // appId/token are required (see "Usage" below) — substitute your own.
  const client = new LsmRecoveryVersionClient({ appId: "...", token: "..." });

  client.getVerses({ string: "John 1:14" }).then((result) => console.log(result));
</script>
```

(`package.json`'s `unpkg`/`jsdelivr` fields point at this same file, so
`https://cdn.jsdelivr.net/npm/@syall/lsm-recovery-version-api-js` also
resolves to it.)

## Usage

```ts
import {
  LsmRecoveryVersionClient,
  IncompleteCredentialsError,
  InvalidInputError,
  UnauthorizedError,
  NetworkError,
} from "@syall/lsm-recovery-version-api-js";

// appId/token are both required — generate them at api.lsm.org and
// pass both. Omitting either throws IncompleteCredentialsError
// synchronously.
const client = new LsmRecoveryVersionClient({
  appId: process.env.LSM_APP_ID,
  token: process.env.LSM_TOKEN,
});

try {
  const result = await client.getVerses({
    string: "Prov. 29:18; Acts 26:19; Eph. 4:4-6; Rev. 21:2, 9-10",
    lang: "eng",
  });

  for (const verse of result.verses) {
    console.log(`${verse.ref} — ${verse.text}`);
  }

  // Required by LSM's Terms of Use: display this alongside the verses.
  console.log(result.copyright);
} catch (err) {
  if (err instanceof InvalidInputError) {
    console.error("Bad reference string:", err.body);
  } else if (err instanceof UnauthorizedError) {
    console.error("Check your app id / token.");
  } else if (err instanceof NetworkError) {
    console.error("Couldn't reach the LSM API:", err.message);
  } else {
    throw err;
  }
}
```

Constructing the client itself can throw `IncompleteCredentialsError` —
that's a configuration mistake (`appId` and/or `token` missing), not an
API-call failure, so it's usually left uncaught rather than handled
alongside the errors above:

```ts
new LsmRecoveryVersionClient({ appId: "only-this-one" });
// throws IncompleteCredentialsError: "Both `appId` and `token` are required."
```

## Building reference strings

`GetVersesParams.string` is a plain string — this package doesn't know
or care how you produce it, and has no dependency on any builder.
Hand-write it per LSM's documented grammar
([api.lsm.org/recver/txo-docs.htm](https://api.lsm.org/recver/txo-docs.htm)),
or use the separate, independent [`@syall/verse-reference-builder`](https://www.npmjs.com/package/@syall/verse-reference-builder)
package for a type-safe (and, for runtime-known data, dynamic/runtime-checked)
builder, and call `.build()` yourself:

```ts
import { LsmRecoveryVersionClient } from "@syall/lsm-recovery-version-api-js";
import { VerseReferenceBuilder } from "@syall/verse-reference-builder";

const client = new LsmRecoveryVersionClient({ appId: "...", token: "..." });

const result = await client.getVerses({
  string: new VerseReferenceBuilder()
    .verse("John", 1, 14)
    .verse("Ephesians", 4, { from: 4, to: 6 })
    .verse("Jude", 9) // single-chapter book — no chapter argument
    .build(),
  // "John 1:14; Ephesians 4:4-6; Jude 9"
});
```

See that package's own README for the full builder API.

## Notes

- **Attribution**: LSM's Terms of Use require displaying the `copyright`
  string from every response alongside any verses shown to end users.
- **No offline storage**: don't persist verse text returned by this API.
- **50-verse limit**: requests beyond 50 verses return a partial result
  with a truncation notice in `message`.
- **Errors can arrive as HTTP 200**: LSM's docs don't specify HTTP status
  codes for any error condition, and the live API has been observed
  reporting an unauthorized request as HTTP 200 with an empty `verses`
  array and a `message` starting with "Error: ..." rather than a 401.
  `getVerses()` checks for this in addition to the HTTP status, so
  `InvalidInputError`/`UnauthorizedError` are still thrown correctly —
  you don't need to inspect `message` yourself.

## Development

```bash
npm install
npm run typecheck
npm test
npm run test:browser      # loads the built UMD bundle in a real browser (see below)
npm run test:runtime:bun  # optional — requires Bun installed (see "Runtime compatibility")
npm run test:runtime:deno # optional — requires Deno installed
npm run build             # emits dist/esm, dist/cjs, and dist/umd
```

Run these from this package directory (`packages/api-client`), or from
the repo root via `npm run <script> --workspace=packages/api-client`.
See the repo root README for the monorepo layout and shared tooling.

`npm run build` compiles `src/` twice — once as ESM into `dist/esm`,
once as CommonJS into `dist/cjs` — and stamps a minimal `package.json`
(`{"type": "module"}` / `{"type": "commonjs"}`) into each so Node
resolves every file's module format correctly regardless of the root
package's own `"type"` field. It also bundles a browser `<script>`-tag
build into `dist/umd` via esbuild (see `../../scripts/build-umd.mjs`,
shared across every package in this monorepo).
`npm run build:esm` / `build:cjs` / `build:umd` run any one part
individually.

`prepublishOnly` re-runs the full test suite and a clean build before
`npm publish`, and `prepare` builds automatically when this package is
installed directly from its git repository (so a git-URL install works
without a separate manual build step).

### Browser smoke test

`npm test` runs `src/`'s unit tests under Node, so it never actually
executes the `dist/umd` bundle the way a `<script src="...">` consumer
would. `npm run test:browser` closes that gap: it builds the UMD
bundle, loads it into a real headless browser via
[`playwright-core`](https://www.npmjs.com/package/playwright-core),
stubs `window.fetch` (no network access needed), and confirms
`window.LsmRecoveryVersionApi` is exposed and `getVerses()` works end
to end (see `test/browser-smoke.mjs` and the shared
`../../scripts/test-browser.mjs` harness).

By default it drives whatever Chrome or Edge is already installed on
your machine — `playwright-core` doesn't download its own browser — so
it works locally with no extra setup as long as one of those is
installed. If neither is found, either install one, or run
`npx playwright install chromium` once to fetch a managed Chromium and
re-run the command. To point at a specific browser binary instead, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/browser`.

Set `PLAYWRIGHT_ENGINE=firefox` or `PLAYWRIGHT_ENGINE=webkit` to run
the same smoke test against Firefox or WebKit instead of the default
Chromium — CI does this for all three (see below) — after first
fetching a managed copy with, e.g., `npx playwright install firefox`.

### CI

`.github/workflows/ci.yml` (at the repo root) defines four independent
jobs, each running against **both packages** in this monorepo:

- **`test`** — runs `test` (which typechecks first via the `pretest`
  script) and `build` for both packages, across a matrix of Node
  20/22/24 on Ubuntu, Windows, and macOS (9 combinations).
- **`browser`** — runs `test:browser` for both packages, matrixed by
  both OS and browser engine (`chromium`/`firefox`/`webkit` × 3 OSes = 9
  combinations), with no Node-version axis at all (one Node version is
  enough to run the driving script). `chromium` drives the system's
  preinstalled Chrome/Edge (every GitHub-hosted runner has one);
  `firefox`/`webkit` aren't preinstalled, so the job fetches a managed
  copy first via `npx playwright@<version> install`, where `<version>`
  is read directly from the root `playwright-core` devDependency (not
  hardcoded) so it can never drift out of sync.
- **`runtime-bun`** / **`runtime-deno`** — build the ESM output for
  both packages, then run each package's `test/runtime-smoke.mjs` (via
  the shared `../../scripts/smoke-test-esm.mjs` harness) under Bun and
  Deno respectively, on a single OS each.

CI does not publish anything; publishing runs through the separate,
manually-triggered `.github/workflows/publish.yml` workflow instead
(see [Releasing](#releasing-changesets) below).

### Runtime compatibility

Beyond Node (tested across three versions × three OSes in the `test`
job above), this package claims to work with Bun and Deno too — both
support the plain ESM output directly. `test/runtime-smoke.mjs` (run
via the shared `../../scripts/smoke-test-esm.mjs` harness) verifies
that claim: it imports the *built* `dist/esm` output (as a real
consumer would), exercises `getVerses()` against a stubbed `fetch`, and
checks the `IncompleteCredentialsError` constructor validation —
written with only standard Web/JS APIs so the identical file runs
unmodified under Node, Bun, or Deno. Run it locally with (each script
builds `dist/esm` itself first, so no separate build step is needed):

```bash
npm run test:runtime:bun   # requires Bun installed
npm run test:runtime:deno  # requires Deno installed
```

### Releasing (Changesets)

Version bumps and `CHANGELOG.md` are managed with
[Changesets](https://github.com/changesets/changesets), independently
per package in this monorepo. For any PR that changes published
behavior:

```bash
npx changeset       # records the change + bump type (patch/minor/major)
```

Commit the generated `.changeset/*.md` file with your PR. See the repo
root's `.changeset/README.md` for more. `npm run version-packages`
(`changeset version`, run from the repo root) is still a manual step,
but publishing itself is automated: dispatching the "Publish" GitHub
Actions workflow (`.github/workflows/publish.yml`) builds, tests, and
publishes via npm Trusted Publishing, pushes the release tag, and opens
a GitHub Release — gated behind a required-reviewer approval on the
`npm-publish` environment.

## License

This package's code is MIT licensed — see `LICENSE`. The verse text and
other content returned by the LSM API it talks to is **not** covered by
that license and remains subject to LSM's own Terms of Use — see
`NOTICE.md` and the Attribution note above.
