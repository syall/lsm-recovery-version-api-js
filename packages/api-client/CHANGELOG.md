# @syall/lsm-recovery-version-api-js

## 0.2.0

### Minor Changes

- 43db31d: Add the `searchType` field (`"references" | "words"`) to `VersesResponse`, and document the API's full-text word-search fallback mode.
  
  Confirmed live: when the `String` parameter doesn't resolve to a recognized verse citation, the API transparently falls back to a full-text search over the whole Bible instead of erroring — `searchType` tells you which happened. Neither this field nor this fallback behavior is mentioned anywhere in LSM's own API documentation; see `DIFFERENCES.md` for verified examples (`"grace"`, `"eternal life"`, `"the church"`) and the observed ranking/matching rules (all-words matching with phrase-priority ranking, not Bible-order results).
  
  `searchType` is present on every live response tested, including error/unauthorized ones, so it's typed as required rather than optional.
- a55d599: Widen `Language` to include three more live-confirmed values: `"por"` (Portuguese), `"zho"` (Chinese), and `"tag"` (Tagalog), in addition to the previously-typed `"eng"`/`"spa"`.
  
  LSM's docs only document `eng`/`spa`, but the live API accepts these three as well and returns correctly translated reference labels and verse text for each — confirmed directly, not inferred. They're the exact 3-letter keys LSM's own reader site uses internally for its multi-language book-abbreviation table (which is what suggested testing them as `Lang` candidates in the first place), not general ISO-639 codes: plausible alternates for the same three languages (`chi`, `zh`, `pt`, `tl`) still `500`, same as any other unsupported value.
  
  See the new "Language support" section in the README and the "Undocumented `Lang` values, in detail" section in `DIFFERENCES.md` for the full live evidence.
- fd5a7bc: Documents a confirmed-live `GetVersesParams.string` edge case: a syntactically well-formed but non-existent reference (an unrecognized book, or a real book with an out-of-range chapter/verse) doesn't error — it comes back as an ordinary, successful `200` response containing one fake `Verse` entry (`{"ref": " 99:99", "urlpfx": "", "text": "No such reference"}`) rather than an error or an empty result.
  
  Adds a new exported constant, `NO_SUCH_REFERENCE_TEXT`, giving you the exact sentinel string (`"No such reference"`) to check for — `verse.text === NO_SUCH_REFERENCE_TEXT` — so you don't have to hardcode it yourself. Also documented in the README's new "Edge cases in `string`" section and a new dedicated "'No such reference' phantom verses, in detail" section in `DIFFERENCES.md`.
- 43813ef: Support the public `file=` query-parameter auth style the production `text.recoveryversion.bible` widget actually uses, as a fallback when `appId`/`token` aren't supplied — confirmed live to work with no registration and no CORS restriction (see `DIFFERENCES.md`).
  
  `appId`/`token` are no longer required: `new LsmRecoveryVersionClient()` (or `{}`) now defaults to sending this built-in public token instead of throwing `IncompleteCredentialsError`. Supplying both `appId` and `token` still uses HTTP Basic Auth exactly as before and takes precedence. Supplying **exactly one** of the two still throws `IncompleteCredentialsError` — that case was never valid and still isn't.
  
  New optional `LsmClientConfig.fileToken` lets you override the built-in default token (e.g. if LSM issues you a different one, or the built-in one is ever revoked).
  
  `IncompleteCredentialsError`'s message changed from ``"Both `appId` and `token` are required."`` to ``"`appId` and `token` must be supplied together, or not at all (see LsmClientConfig)."`` to describe the new rule accurately — this is a breaking change if you were matching on the exact error message text (matching on `instanceof IncompleteCredentialsError` is unaffected).

### Patch Changes

- efd275e: Add missing explicit type in `getVerses()`.
- e9332f5: Documents confirmed-live findings on using localized book abbreviations as `GetVersesParams.string` input, not just as a `lang`-driven output format. They generally work, but only paired with the matching `lang` — a mismatch doesn't reliably error, it can silently resolve to a completely different, wrong book: e.g. `"Jo 3:16"` (John's Portuguese abbreviation) under `lang: "eng"` silently returns a real verse from **Joshua** 3:16 instead of John. One specific Chinese abbreviation (John's `"約"`) doesn't resolve correctly even under its own matching `lang`.
  
  Documentation-only — no behavior change, and this package still never inspects `string` before sending it. See the README's expanded "Language support" section and the new "Localized abbreviations as `String=` input, in detail" section in `DIFFERENCES.md` for the full findings table and examples.
- e185603: Update README to explicit state not supporting `OSIS`.
- 16cdfd2: Add `DIFFERENCES.md`, cataloguing every place LSM's published API docs (https://api.lsm.org/recver/txo-docs.htm) were found to disagree with, or omit, the live API's actual behavior — auth, error signaling (always HTTP 200 with a `message`, never a real 401/400 in any case tested), disallowed-character handling, the undocumented `searchType`/word-search mode, and the `urlpfx` field. Also corrected doc comments in `errors.ts`/`client.ts` that previously repeated the docs' claims about error conditions uncritically (e.g. that malformed input "will result in an error") without noting they don't match observed behavior.
  
  No runtime behavior changes in this changeset — see the sibling changesets for the `file=`-token auth fallback and `searchType` typing, which are the code changes this documentation describes.
- 11431f7: Documents a confirmed-live `GetVersesParams.string` edge case, not validated for you by this package: an **empty `string`** doesn't get a `verses`-shaped response at all — LSM's API returns its own HTML documentation landing page instead, mislabeled `content-type: application/json`. Since this package can't parse HTML as JSON, it surfaces as a generic `LsmApiError` ("The API response could not be parsed as JSON") with the HTML dumped into `err.body`, rather than any more specific error.
  
  Documentation-only — no behavior change. See the new "Edge cases in `string`" section in the README, the expanded `GetVersesParams.string` doc comment in `types.ts`, and `DIFFERENCES.md` row 9.

## 0.1.5

### Patch Changes

- 50a11bf: The "Initial pre-1.0 release" notes for v0.1.3 described
  `InvalidInputError`/`UnauthorizedError` as tied to a literal HTTP
  400/401 status. That was never the full picture — since LSM's docs
  don't specify HTTP status codes and the API can report a failure via an
  HTTP 200 response with an `Error: ...`-prefixed `message` field
  instead. `getVerses()` is now updated to check for potential error
  messages and throw corresponding invalid input and unauthorized errors.
- 295f4dc: Updated documentation for 0.13.0 that was inconsistent with the repository.

## 0.1.4

### Patch Changes

- e59ad19: Verify release via publish workflow.

## 0.1.3

Initial pre-1.0 release. The public API may still change without a
major version bump (per [SemVer's rules for initial
development](https://semver.org/#spec-item-4)).

### Minor Changes

- JSON-only TypeScript client (`LsmRecoveryVersionClient`) for the LSM
  Text Only Holy Bible Recovery Version API.
- `appId`/`token` are both required — the constructor throws
  `IncompleteCredentialsError` if either is missing, matching LSM's API,
  which requires HTTP Basic Authentication on every request with no
  anonymous mode.
- Typed error hierarchy: `LsmApiError` (base, carries `status`/`body`/`cause`),
  `InvalidInputError`, `UnauthorizedError`, `NetworkError` (fetch itself
  failed), and `IncompleteCredentialsError`. Since LSM's docs don't
  specify HTTP status codes and the API can report a failure via an
  HTTP 200 response with an `Error: ...`-prefixed `message` field rather
  than a 4xx status, `getVerses()` checks for that pattern too, so
  `InvalidInputError`/`UnauthorizedError` are thrown correctly either
  way.
- Dual ESM/CommonJS builds (`dist/esm`, `dist/cjs`) plus a
  dependency-free browser `<script>`-tag UMD build (`dist/umd`),
  exposing a `LsmRecoveryVersionApi` global.
- Node, Bun, and Deno runtime compatibility, and browser compatibility
  (via the UMD bundle), all verified in CI rather than just claimed.
- MIT licensed; see `NOTICE.md` for how that differs from LSM's own
  terms covering the verse content the API returns.

> From this point on, entries in this file are generated by
> [Changesets](https://github.com/changesets/changesets) — see the
> repo root's `.changeset/README.md` for how to add one.
