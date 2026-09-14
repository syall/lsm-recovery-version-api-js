---
"@syall/lsm-recovery-version-api-js": patch
---

Documents confirmed-live findings on using localized book abbreviations as `GetVersesParams.string` input, not just as a `lang`-driven output format. They generally work, but only paired with the matching `lang` — a mismatch doesn't reliably error, it can silently resolve to a completely different, wrong book: e.g. `"Jo 3:16"` (John's Portuguese abbreviation) under `lang: "eng"` silently returns a real verse from **Joshua** 3:16 instead of John. One specific Chinese abbreviation (John's `"約"`) doesn't resolve correctly even under its own matching `lang`.

Documentation-only — no behavior change, and this package still never inspects `string` before sending it. See the README's expanded "Language support" section and the new "Localized abbreviations as `String=` input, in detail" section in `DIFFERENCES.md` for the full findings table and examples.
