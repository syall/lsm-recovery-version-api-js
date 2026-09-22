# @syall/verse-reference-builder

## 0.3.0

### Minor Changes

- 2eeb977: Raise the supported Node floor from 20 to 22.
  
  Node 20 reached end-of-life on 2026-04-30 and is no longer covered by CI,
  which now runs a Node 22/24/26 matrix. No source changed in either package —
  this only raises the `engines.node` field, so npm warns (or fails under
  `engine-strict`) when installing on Node 20 or older. Consumers still on
  Node 20 can stay on the previous release.

## 0.2.1

### Patch Changes

- 9c6feb2: Update README with no verse reference and disallowed character validation.

## 0.2.0

### Minor Changes

- 289659a: `validate()` now flags two more problems proactively, both as warnings rather than thrown errors:
  
  - **Disallowed characters**: any character in the built output that falls outside LSM's documented `String` grammar (letters, digits, spaces, `.`, `,`, `;`, `-`). LSM's docs claim such a character "will result in an error and no output," but the sibling `@syall/lsm-recovery-version-api-js` package found live that it actually just silently falls back to a zero-result word search — either way, not what was intended. This can't currently be triggered through any of `VerseReferenceBuilder`'s public methods — every book name/abbreviation and verse citation this package can serialize is already plain ASCII within the allowed set — so in practice `validate()`'s `warnings` array won't gain this entry for existing callers. It's defense in depth against a future book/citation form introducing a disallowed character, mirroring the role `InvalidInputError` plays in the API client package. Also adds a new public export, `findDisallowedCharacters(built: string): string[]`, the underlying check — for anyone validating a hand-built or otherwise externally-sourced `String` value that didn't go through this builder at all.
  - **Empty output**: calling `validate()` (or `build()`) with no verse references added at all — typically a forgotten `.verse()`/`.wholeChapter()`/etc. call. `build()` returns `""` in that case, and the sibling `@syall/lsm-recovery-version-api-js` package found live that LSM's API treats an empty `String=` specially: it returns its own HTML documentation landing page (mislabeled as JSON) rather than an error or an empty result — a confusing failure mode worth flagging before a request is ever sent.
- f0e5d29: Corrected `versesPerChapter` in `bookData.ts` for 120 chapters across Psalms (119 of 150 chapters) and Isaiah (chapter 23), verified directly against the live Recovery Version reader site (https://text.recoveryversion.bible) — every one of this package's 1,189 chapters was checked against that chapter's live page and its highest `id="{code}{chapter}-{verse}"` anchor, which is the site's own verse numbering.
  
  Nearly all of the Psalms corrections are the same root cause: 119 Psalms carry a title/superscription (e.g. "A Psalm of David, when he fled from Absalom his son") that the live site numbers as verse **0** (`class="text-outline"`, not `class="verse"`), not verse 1. This package's previous data apparently counted that title as verse 1 instead, shifting every later verse in the chapter up by one relative to the Recovery Version's actual numbering. Psalm 119 (177 → 176, no title) and Isaiah 23 (19 → 18) are ordinary versification corrections unrelated to the title pattern.
  
  This changes the return value of `versesInChapter()` for the affected book/chapter pairs, and therefore `validate()`'s computed verse counts for any whole-chapter or range request touching one of them (e.g. `wholeChapter("Psalms", 119)` now reports 176 verses, not 177) — if your code hardcoded expectations against the old counts for these specific chapters, it will see different (now-correct) numbers.
  
  No changes to `chapters` (chapter counts) or `abbr` for any book — both were already verified against LSM's own docs and matched. See `bookData.ts`'s updated doc comment for the full methodology.

## 0.1.5

### Patch Changes

- 295f4dc: Updated documentation for 0.13.0 that was inconsistent with the repository.

## 0.1.4

### Patch Changes

- e59ad19: Verify release via publish workflow.

## 0.1.3

Initial pre-1.0 release. The public API may still change without a
major version bump (per [SemVer's rules for initial
development](https://semver.org/#spec-item-4)).

### Minor Changes

- Type-safe `VerseReferenceBuilder` for the LSM Text Only Holy Bible
  Recovery Version API's verse-reference `String` input, with
  compile-time chapter-range checking per book, proven by
  `@ts-expect-error` compile tests.
- `.verseRange()` / `.dynamicVerseRange()` for verse ranges spanning two
  chapters of the same book (e.g. "John 1:30-2:5").
- `.dynamicVerse()` / `.dynamicWholeChapter()` / `.dynamicVerseRange()`
  runtime-checked equivalents for book names/chapters/verses only known
  at runtime.
- Verses-per-chapter data, supplied from an external source since LSM's
  own docs publish chapter counts but not verses-per-chapter, lives as a
  `versesPerChapter` property on each book's own entry in `BOOKS` (e.g.
  `BOOKS.John.versesPerChapter`, also accessible via
  `versesInChapter(book, chapter)`). It backs: every method that takes a
  specific verse citation throwing a `RangeError` if that verse doesn't
  exist in the chapter or if a range's "from" comes after its "to"; and
  `.validate()` giving an **exact** `verseCount` — including
  whole-chapter and cross-chapter-range entries — against LSM's
  50-verse-per-request cap, rather than a lower-bound estimate. Each
  book's `chapters`/`abbr` fields are literal types (for compile-time
  chapter-range checking); `versesPerChapter` is typed as
  `readonly number[]` rather than a literal tuple, keeping the compiled
  `.d.ts` output small.
- Zero runtime dependencies.
- Dual ESM/CommonJS builds (`dist/esm`, `dist/cjs`) plus a
  dependency-free browser `<script>`-tag UMD build (`dist/umd`),
  exposing a `VerseReferenceBuilder` global.
- MIT licensed.

> From this point on, entries in this file are generated by
> [Changesets](https://github.com/changesets/changesets) — see the
> repo root's `.changeset/README.md` for how to add one.
