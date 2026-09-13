import { BOOKS } from "./bookData.js";

/**
 * The literal union of all 66 valid book names, derived directly from
 * bookData.ts — this is what gives IntelliSense a dropdown of every
 * valid book name when calling `.verse("...")`.
 */
export type BookName = keyof typeof BOOKS;

type ChapterCountOf<B extends BookName> = (typeof BOOKS)[B]["chapters"];

/**
 * Builds the literal numeric union [1, 2, ..., N] via the standard
 * tuple-accumulator recursive-conditional-type trick. Bounded by
 * Psalms' 150 chapters — the largest count in the table — which is
 * well within TypeScript's recursion limit for this pattern (commonly
 * used up to several hundred without hitting "type instantiation is
 * excessively deep").
 */
type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc["length"]]>;

/** Inclusive [1, N] as a literal numeric union. */
type OneTo<N extends number> = Exclude<Enumerate<N> | N, 0>;

/**
 * The set of valid chapter numbers for a specific book, e.g.
 * `ChapterOf<"Ephesians">` is the literal union `1 | 2 | 3 | 4 | 5 | 6`.
 * Passing an out-of-range chapter number for a given book is a
 * compile-time type error, not a runtime surprise.
 */
export type ChapterOf<B extends BookName> = OneTo<ChapterCountOf<B>>;

/**
 * Books with exactly one chapter, per LSM's table: Obadiah, Philemon,
 * 2 John, 3 John, Jude. Computed from the table itself (chapters
 * extends 1) rather than hand-listed, so it can never drift from
 * bookData.ts.
 *
 * Per the docs: "A final note regarding single chapter books is that
 * they are to be referenced as though they contained only verses...
 * Jude 9 is valid, but Jude 1:9 is not valid."
 */
export type SingleChapterBook = {
  [K in BookName]: ChapterCountOf<K> extends 1 ? K : never;
}[BookName];

/**
 * Optional partial-verse letter suffix (e.g. "18a", "45b"). Observed in
 * LSM's own worked examples (`Prov. 29:18a`, `1 Cor. 15:45b`) even
 * though the docs' stated character rule says chapter/verse positions
 * take "only Arabic numerals" — a direct contradiction between the
 * prose rule and the worked examples. The API accepts these and
 * silently strips them (the `detected` field in every example shows
 * the suffix removed), so this is purely a citation-style convenience
 * with NO effect on which text is returned — supported here for
 * copy-paste compatibility with printed Recovery Version references,
 * not because it changes API behavior.
 */
export type VersePartialMarker = "a" | "b" | "c";

/** A single verse citation: a bare number, or number + partial marker. */
export type VerseCitation = number | `${number}${VersePartialMarker}`;

/**
 * A hyphenated verse range within a single chapter (e.g. "4-6"): both
 * endpoints are plain verse numbers within whatever chapter the
 * surrounding call specifies. For a range spanning two chapters (e.g.
 * "1:30-2:5"), use `.verseRange()` / `.dynamicVerseRange()` instead —
 * see `ChapterVersePoint` below.
 */
export interface VerseRange {
  from: VerseCitation;
  to: VerseCitation;
}

/**
 * One endpoint of a cross-chapter verse range passed to `.verseRange()`
 * / `.dynamicVerseRange()` — a specific chapter and verse, e.g.
 * `{ chapter: 1, verse: 30 }`.
 */
export interface ChapterVersePoint {
  chapter: number;
  verse: VerseCitation;
}

/**
 * One or more verse citations/ranges. An array renders as a
 * comma-separated list — per the docs, the comma is valid "only for
 * additional verse citations within the same book and chapter" (e.g.
 * `Heb. 1:2, 5-6, 8`), so every element of the array shares the single
 * chapter passed to the same `.verse()` call.
 */
export type VerseSpec = VerseCitation | VerseRange | Array<VerseCitation | VerseRange>;

/**
 * Call-signature shape for `.verse(book, ...)`, conditioned on whether
 * `book` is a single-chapter book. Selecting a single-chapter book
 * (e.g. "Jude") narrows the call to `.verse("Jude", 9)` — no chapter
 * argument accepted, matching the documented grammar exactly. Any other
 * book requires `.verse("Ephesians", 4, { from: 4, to: 6 })`, with the
 * chapter argument's type restricted to that book's valid chapter range.
 */
export type VerseArgs<B extends BookName> = B extends SingleChapterBook
  ? [verse: VerseSpec]
  : [chapter: ChapterOf<B>, verse: VerseSpec];

/** Books that have more than one chapter — i.e. all except SingleChapterBook. */
export type MultiChapterBook = Exclude<BookName, SingleChapterBook>;
