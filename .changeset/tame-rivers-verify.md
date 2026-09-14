---
"@syall/verse-reference-builder": minor
---

Corrected `versesPerChapter` in `bookData.ts` for 120 chapters across Psalms (119 of 150 chapters) and Isaiah (chapter 23), verified directly against the live Recovery Version reader site (https://text.recoveryversion.bible) — every one of this package's 1,189 chapters was checked against that chapter's live page and its highest `id="{code}{chapter}-{verse}"` anchor, which is the site's own verse numbering.

Nearly all of the Psalms corrections are the same root cause: 119 Psalms carry a title/superscription (e.g. "A Psalm of David, when he fled from Absalom his son") that the live site numbers as verse **0** (`class="text-outline"`, not `class="verse"`), not verse 1. This package's previous data apparently counted that title as verse 1 instead, shifting every later verse in the chapter up by one relative to the Recovery Version's actual numbering. Psalm 119 (177 → 176, no title) and Isaiah 23 (19 → 18) are ordinary versification corrections unrelated to the title pattern.

This changes the return value of `versesInChapter()` for the affected book/chapter pairs, and therefore `validate()`'s computed verse counts for any whole-chapter or range request touching one of them (e.g. `wholeChapter("Psalms", 119)` now reports 176 verses, not 177) — if your code hardcoded expectations against the old counts for these specific chapters, it will see different (now-correct) numbers.

No changes to `chapters` (chapter counts) or `abbr` for any book — both were already verified against LSM's own docs and matched. See `bookData.ts`'s updated doc comment for the full methodology.
