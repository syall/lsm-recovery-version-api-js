---
"@syall/lsm-recovery-version-api-js": patch
---

The "Initial pre-1.0 release" notes for v0.1.3 described
`InvalidInputError`/`UnauthorizedError` as tied to a literal HTTP
400/401 status. That was never the full picture — since LSM's docs
don't specify HTTP status codes and the API can report a failure via an
HTTP 200 response with an `Error: ...`-prefixed `message` field
instead. `getVerses()` is now updated to check for potential error
messages and throw corresponding invalid input and unauthorized errors.
