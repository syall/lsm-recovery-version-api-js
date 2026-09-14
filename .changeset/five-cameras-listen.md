---
"@syall/lsm-recovery-version-api-js": minor
---

Widen `Language` to include three more live-confirmed values: `"por"` (Portuguese), `"zho"` (Chinese), and `"tag"` (Tagalog), in addition to the previously-typed `"eng"`/`"spa"`.

LSM's docs only document `eng`/`spa`, but the live API accepts these three as well and returns correctly translated reference labels and verse text for each — confirmed directly, not inferred. They're the exact 3-letter keys LSM's own reader site uses internally for its multi-language book-abbreviation table (which is what suggested testing them as `Lang` candidates in the first place), not general ISO-639 codes: plausible alternates for the same three languages (`chi`, `zh`, `pt`, `tl`) still `500`, same as any other unsupported value.

See the new "Language support" section in the README and the "Undocumented `Lang` values, in detail" section in `DIFFERENCES.md` for the full live evidence.
