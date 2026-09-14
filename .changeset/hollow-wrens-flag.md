---
"@syall/lsm-recovery-version-api-js": minor
---

Documents a confirmed-live `GetVersesParams.string` edge case: a syntactically well-formed but non-existent reference (an unrecognized book, or a real book with an out-of-range chapter/verse) doesn't error — it comes back as an ordinary, successful `200` response containing one fake `Verse` entry (`{"ref": " 99:99", "urlpfx": "", "text": "No such reference"}`) rather than an error or an empty result.

Adds a new exported constant, `NO_SUCH_REFERENCE_TEXT`, giving you the exact sentinel string (`"No such reference"`) to check for — `verse.text === NO_SUCH_REFERENCE_TEXT` — so you don't have to hardcode it yourself. Also documented in the README's new "Edge cases in `string`" section and a new dedicated "'No such reference' phantom verses, in detail" section in `DIFFERENCES.md`.
