---
"@syall/lsm-recovery-version-api-js": patch
---

Add `DIFFERENCES.md`, cataloguing every place LSM's published API docs (https://api.lsm.org/recver/txo-docs.htm) were found to disagree with, or omit, the live API's actual behavior — auth, error signaling (always HTTP 200 with a `message`, never a real 401/400 in any case tested), disallowed-character handling, the undocumented `searchType`/word-search mode, and the `urlpfx` field. Also corrected doc comments in `errors.ts`/`client.ts` that previously repeated the docs' claims about error conditions uncritically (e.g. that malformed input "will result in an error") without noting they don't match observed behavior.

No runtime behavior changes in this changeset — see the sibling changesets for the `file=`-token auth fallback and `searchType` typing, which are the code changes this documentation describes.
