---
"@syall/lsm-recovery-version-api-js": minor
"@syall/verse-reference-builder": minor
---

Raise the supported Node floor from 20 to 22.

Node 20 reached end-of-life on 2026-04-30 and is no longer covered by CI,
which now runs a Node 22/24/26 matrix. No source changed in either package —
this only raises the `engines.node` field, so npm warns (or fails under
`engine-strict`) when installing on Node 20 or older. Consumers still on
Node 20 can stay on the previous release.
