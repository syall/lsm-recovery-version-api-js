---
"@syall/lsm-recovery-version-api-js": patch
---

Documents a confirmed-live `GetVersesParams.string` edge case, not validated for you by this package: an **empty `string`** doesn't get a `verses`-shaped response at all — LSM's API returns its own HTML documentation landing page instead, mislabeled `content-type: application/json`. Since this package can't parse HTML as JSON, it surfaces as a generic `LsmApiError` ("The API response could not be parsed as JSON") with the HTML dumped into `err.body`, rather than any more specific error.

Documentation-only — no behavior change. See the new "Edge cases in `string`" section in the README, the expanded `GetVersesParams.string` doc comment in `types.ts`, and `DIFFERENCES.md` row 9.
