---
"@syall/lsm-recovery-version-api-js": minor
---

Support the public `file=` query-parameter auth style the production `text.recoveryversion.bible` widget actually uses, as a fallback when `appId`/`token` aren't supplied — confirmed live to work with no registration and no CORS restriction (see `DIFFERENCES.md`).

`appId`/`token` are no longer required: `new LsmRecoveryVersionClient()` (or `{}`) now defaults to sending this built-in public token instead of throwing `IncompleteCredentialsError`. Supplying both `appId` and `token` still uses HTTP Basic Auth exactly as before and takes precedence. Supplying **exactly one** of the two still throws `IncompleteCredentialsError` — that case was never valid and still isn't.

New optional `LsmClientConfig.fileToken` lets you override the built-in default token (e.g. if LSM issues you a different one, or the built-in one is ever revoked).

`IncompleteCredentialsError`'s message changed from ``"Both `appId` and `token` are required."`` to ``"`appId` and `token` must be supplied together, or not at all (see LsmClientConfig)."`` to describe the new rule accurately — this is a breaking change if you were matching on the exact error message text (matching on `instanceof IncompleteCredentialsError` is unaffected).
