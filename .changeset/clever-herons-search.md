---
"@syall/lsm-recovery-version-api-js": minor
---

Add the `searchType` field (`"references" | "words"`) to `VersesResponse`, and document the API's full-text word-search fallback mode.

Confirmed live: when the `String` parameter doesn't resolve to a recognized verse citation, the API transparently falls back to a full-text search over the whole Bible instead of erroring — `searchType` tells you which happened. Neither this field nor this fallback behavior is mentioned anywhere in LSM's own API documentation; see `DIFFERENCES.md` for verified examples (`"grace"`, `"eternal life"`, `"the church"`) and the observed ranking/matching rules (all-words matching with phrase-priority ranking, not Bible-order results).

`searchType` is present on every live response tested, including error/unauthorized ones, so it's typed as required rather than optional.
