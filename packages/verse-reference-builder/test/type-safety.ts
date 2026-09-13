/**
 * This file is not a runtime test — it never executes any assertions.
 * Its entire purpose is to be compiled by `tsc --noEmit` (see
 * package.json's `typecheck` script) as proof that the type system
 * genuinely enforces book/chapter validity, not just that the code
 * happens to run correctly for valid input.
 *
 * Every line below `// @ts-expect-error` is intentionally invalid.
 * `@ts-expect-error` itself is a compile error if the following line
 * DOESN'T produce an error — so a clean `tsc --noEmit` run over this
 * file proves both halves at once: valid calls compile, and each
 * specific invalid call is rejected for the stated reason.
 */
import { VerseReferenceBuilder } from "../src/index.js";

const b = new VerseReferenceBuilder();

// --- Valid calls: must compile with no error ---

b.verse("John", 1, 14);
b.verse("John", 21, { from: 1, to: 5 });
b.verse("Hebrews", 1, [2, { from: 5, to: 6 }, 8]);
b.verse("Ephesians", 6, 24);
b.verse("Psalms", 150, 6); // largest chapter count in the table
b.verse("Jude", 9); // single-chapter book: no chapter argument
b.verse("Obadiah", 1);
b.verse("2 John", 4);
b.wholeChapter("John", 1);
b.verse("Proverbs", 29, "18a"); // partial-verse marker
b.verseRange("John", { chapter: 1, verse: 30 }, { chapter: 2, verse: 5 });
b.verseRange("Psalms", { chapter: 119, verse: 1 }, { chapter: 150, verse: 6 });

// --- Invalid calls: must each produce a compile error ---

// @ts-expect-error — "Ephesians" only has 6 chapters; 7 is out of range.
b.verse("Ephesians", 7, 1);

// @ts-expect-error — "John" has 21 chapters; 0 is not a valid chapter (1-indexed).
b.verse("John", 0, 1);

// @ts-expect-error — "Psalms" has 150 chapters; 151 is out of range.
b.verse("Psalms", 151, 1);

// @ts-expect-error — "Jude" is single-chapter: no chapter argument accepted,
// only (book, verse) — matches the docs' "Jude 1:9 is not valid" rule.
b.verse("Jude", 1, 9);

// @ts-expect-error — "Not A Real Book" isn't one of the 66 literal book names.
b.verse("Not A Real Book", 1, 1);

// @ts-expect-error — wholeChapter() is restricted to MultiChapterBook;
// single-chapter books aren't offered a "whole book" shorthand.
b.wholeChapter("Jude", 1);

// @ts-expect-error — misspelled book name, close but not exact.
b.verse("Ephesian", 4, 1);

// @ts-expect-error — verseRange() is restricted to MultiChapterBook;
// single-chapter books can't have a cross-chapter range at all.
b.verseRange("Jude", { chapter: 1, verse: 1 }, { chapter: 1, verse: 5 });

// @ts-expect-error — "Ephesians" only has 6 chapters; 7 is out of range
// for the "to" endpoint of a verseRange().
b.verseRange("Ephesians", { chapter: 1, verse: 1 }, { chapter: 7, verse: 1 });

export {};
