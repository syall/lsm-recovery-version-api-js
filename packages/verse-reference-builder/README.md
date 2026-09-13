# @syall/verse-reference-builder

Type-safe (and, for runtime-known data, dynamic/runtime-checked) builder
for the verse-reference `String` grammar documented at
[api.lsm.org/recver/txo-docs.htm](https://api.lsm.org/recver/txo-docs.htm)
for the LSM Text Only Holy Bible Recovery Version API.

This package has **no runtime dependencies** and knows nothing about
HTTP or the LSM API client — it only builds and validates reference
strings. Pair it with [`@syall/lsm-recovery-version-api-js`](https://www.npmjs.com/package/@syall/lsm-recovery-version-api-js)
(or any other client) by calling `.build()` yourself and passing the
result along:

```ts
import { VerseReferenceBuilder } from "@syall/verse-reference-builder";
import { LsmRecoveryVersionClient } from "@syall/lsm-recovery-version-api-js";

const client = new LsmRecoveryVersionClient({ appId: "...", token: "..." });

const string = new VerseReferenceBuilder()
  .verse("John", 1, 14)
  .verse("Ephesians", 4, { from: 4, to: 6 })
  .verse("Jude", 9) // single-chapter book — no chapter argument
  .build();
// "John 1:14; Ephesians 4:4-6; Jude 9"

const result = await client.getVerses({ string });
```

## Install

```bash
npm install @syall/verse-reference-builder
```

Ships both ESM (`import`) and CommonJS (`require`) builds, plus type
declarations for both — works with Node, Bun, Deno, and any bundler
(webpack, esbuild, Vite, Rollup, etc.) targeting either module system.
Node and Bun/Deno compatibility are both verified in CI, not just
claimed. Requires Node 20+ (no runtime APIs beyond that are actually
used — this floor matches the sibling `@syall/lsm-recovery-version-api-js`
package for consistency).

```ts
// ESM / TypeScript
import { VerseReferenceBuilder } from "@syall/verse-reference-builder";
```

```js
// CommonJS
const { VerseReferenceBuilder } = require("@syall/verse-reference-builder");
```

### Browser `<script>` tag (no bundler)

A dependency-free, minified UMD-style build is also published under
`dist/umd`, exposing a `VerseReferenceBuilder` global — usable directly
from a CDN with no build step:

```html
<script src="https://unpkg.com/@syall/verse-reference-builder/dist/umd/verse-reference-builder.min.js"></script>
<script>
  const { VerseReferenceBuilder } = window.VerseReferenceBuilder;
  const string = new VerseReferenceBuilder().verse("John", 1, 14).build();
</script>
```

(`package.json`'s `unpkg`/`jsdelivr` fields point at this same file, so
`https://cdn.jsdelivr.net/npm/@syall/verse-reference-builder` also
resolves to it.)

## Building reference strings

Two ways to add a verse reference:

- **`.verse(book, ...)`** — the type-safe path. `book` must be one of
  the 66 literal book names (IntelliSense-completed); the subsequent
  argument shape and the valid chapter range are both enforced at
  compile time based on which book you picked. Picking a book name
  gives IntelliSense over all 66 valid names; the chapter argument is
  then type-restricted to that specific book's chapter count (e.g.
  `.verse("Ephesians", 7, 1)` is a compile-time error — Ephesians only
  has 6 chapters), and single-chapter books (Obadiah, Philemon, 2 John,
  3 John, Jude) drop the chapter argument entirely, matching the docs'
  rule that `Jude 9` is valid but `Jude 1:9` is not. These constraints
  are proven, not just asserted: `test/type-safety.ts` is a set of
  `@ts-expect-error`-annotated calls compiled by `tsc --noEmit` as part
  of `npm test`.

- **`.dynamicVerse(book, ...)`** — the runtime path, for when the book
  name/chapter/verse are only known at runtime (e.g. from a form or
  database row) and can't be literal types. Performs the equivalent
  validation at call time instead, throwing descriptive errors.
  `book` accepts any full name or LSM-documented abbreviation
  (case-insensitively).

```ts
new VerseReferenceBuilder()
  .verse("John", 1, 14)
  .verse("Ephesians", 4, { from: 4, to: 6 })
  .verse("Jude", 9)
  .build();
// "John 1:14; Ephesians 4:4-6; Jude 9"

const row = { book: "eph.", chapter: 4, verses: [4, 5, 6] };
new VerseReferenceBuilder().dynamicVerse(row.book, row.chapter, row.verses).build();
// "Ephesians 4:4, 5, 6"
```

`.wholeChapter(book, chapter)` / `.dynamicWholeChapter(book, chapter)`
request an entire chapter (e.g. "John 1"), restricted to multi-chapter
books per the docs.

`.verseRange(book, from, to)` / `.dynamicVerseRange(book, from, to)`
build a verse range spanning two chapters of the same book (e.g.
"John 1:30-2:5"), restricted to multi-chapter books:

```ts
new VerseReferenceBuilder()
  .verseRange("John", { chapter: 1, verse: 30 }, { chapter: 2, verse: 5 })
  .build();
// "John 1:30-2:5"
```

Every method that takes a specific verse citation (`.verse()`,
`.dynamicVerse()`, `.verseRange()`, `.dynamicVerseRange()`) checks it
against a verses-per-chapter table and throws a `RangeError` immediately
if the verse doesn't exist in that chapter:

```ts
new VerseReferenceBuilder().verse("Jude", 26);
// RangeError: Jude chapter 1 has 25 verses (per the supplied
// verses-per-chapter data); verse 26 doesn't exist.
```

`.validate()` gives an **exact** verse count against LSM's
50-verse-per-request cap — including whole-chapter and
cross-chapter-range entries, whose count previously couldn't be
determined at all since LSM's own docs publish chapter counts but not
verses-per-chapter:

```ts
const { verseCount, warnings } = new VerseReferenceBuilder()
  .wholeChapter("Psalms", 119)
  .validate();
// verseCount: 177, warnings: ["177 verses requested, over LSM's 50-verse cap..."]
```

`.build(options)` accepts `{ useAbbreviations?: boolean }`.

See `src/*.ts` for the full set of edge cases this builder accounts for
(comma vs. semicolon semantics, partial-verse letter markers like
`18a`, the 50-verse cap), each with an inline citation back to the
specific statement or worked example in LSM's docs that motivated it.

### Verses-per-chapter data

LSM's own documentation gives only chapter counts, not verses per
chapter, so this package can't check verse existence or compute an
exact verse count from LSM's docs alone. `src/bookData.ts` also
supplies that data — as a `versesPerChapter` array on each book's own
entry in `BOOKS` (transcribed from an external source and mapped onto
this package's book names) — and powers both the `RangeError` checks
above and `.validate()`'s exact `verseCount`. It's also accessible
directly if you need it: `BOOKS.John.versesPerChapter` (per-book) or
the `versesInChapter(book, chapter)` helper.

## Development

```bash
npm install
npm run typecheck         # includes test/type-safety.ts's @ts-expect-error proofs
npm test
npm run test:browser      # loads the built UMD bundle in a real browser
npm run test:runtime:bun  # optional — requires Bun installed
npm run test:runtime:deno # optional — requires Deno installed
npm run build             # emits dist/esm, dist/cjs, and dist/umd
```

Run these from this package directory (`packages/verse-reference-builder`),
or from the repo root via `npm run <script> --workspace=packages/verse-reference-builder`.
See the repo root README for the monorepo layout and shared tooling.

## License

MIT — see `LICENSE`. This package builds reference *strings only*; it
never contacts the LSM API and never handles verse text, so — unlike
`@syall/lsm-recovery-version-api-js` — there is no separate third-party
content notice here.
