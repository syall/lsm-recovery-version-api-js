import { test } from "node:test";
import assert from "node:assert/strict";
import { VerseReferenceBuilder, resolveBookName, BOOKS } from "../src/index.js";

// Regression guard for bookData.ts's hand-maintained data: a future manual
// edit (adding/removing a chapter, trimming a versesPerChapter array) could
// silently desync `chapters` from `versesPerChapter.length` without this —
// exactly the kind of mismatch the Psalms/Isaiah versesPerChapter
// correction (see bookData.ts's doc comment) was hunting for by hand.
test("BOOKS has all 66 canonical books, each with a versesPerChapter length matching its chapters count", () => {
  const names = Object.keys(BOOKS);
  assert.equal(names.length, 66);

  const mismatches = names
    .map((name) => {
      const book = BOOKS[name as keyof typeof BOOKS];
      return { name, chapters: book.chapters, versesPerChapterLength: book.versesPerChapter.length };
    })
    .filter((entry) => entry.chapters !== entry.versesPerChapterLength);

  assert.deepEqual(mismatches, []);
});

test("single verse", () => {
  const s = new VerseReferenceBuilder().verse("John", 1, 14).build();
  assert.equal(s, "John 1:14");
});

test("verse range renders with a hyphen", () => {
  const s = new VerseReferenceBuilder().verse("Ephesians", 4, { from: 4, to: 6 }).build();
  assert.equal(s, "Ephesians 4:4-6");
});

test("comma-separated citations within the same chapter", () => {
  const s = new VerseReferenceBuilder()
    .verse("Hebrews", 1, [2, { from: 5, to: 6 }, 8])
    .build();
  assert.equal(s, "Hebrews 1:2, 5-6, 8");
});

test("multiple entries join with semicolons", () => {
  const s = new VerseReferenceBuilder()
    .verse("Proverbs", 29, 18)
    .verse("Acts", 26, 19)
    .verse("Ephesians", 4, { from: 4, to: 6 })
    .build();
  assert.equal(s, "Proverbs 29:18; Acts 26:19; Ephesians 4:4-6");
});

test("single-chapter books omit the chapter/colon entirely", () => {
  const s = new VerseReferenceBuilder().verse("Jude", 9).build();
  assert.equal(s, "Jude 9");
});

test("whole-chapter entries omit the colon and verse", () => {
  const s = new VerseReferenceBuilder().wholeChapter("John", 1).build();
  assert.equal(s, "John 1");
});

test("partial-verse letter markers are passed through in default format", () => {
  const s = new VerseReferenceBuilder().verse("Proverbs", 29, "18a").build();
  assert.equal(s, "Proverbs 29:18a");
});

test("useAbbreviations swaps in LSM's recommended abbreviation", () => {
  const s = new VerseReferenceBuilder()
    .verse("Ephesians", 4, { from: 4, to: 6 })
    .verse("Jude", 9)
    .build({ useAbbreviations: true });
  assert.equal(s, "Eph. 4:4-6; Jude 9");
});

test("dynamicVerse resolves full names, abbreviations, and case-insensitively", () => {
  const s1 = new VerseReferenceBuilder().dynamicVerse("ephesians", 4, 6).build();
  const s2 = new VerseReferenceBuilder().dynamicVerse("Eph.", 4, 6).build();
  const s3 = new VerseReferenceBuilder().dynamicVerse("eph", 4, 6).build();
  assert.equal(s1, "Ephesians 4:6");
  assert.equal(s2, "Ephesians 4:6");
  assert.equal(s3, "Ephesians 4:6");
});

test("dynamicVerse throws on an unrecognized book", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(() => b.dynamicVerse("Not A Real Book", 1, 1), RangeError);
});

test("dynamicVerse throws on an out-of-range chapter", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(() => b.dynamicVerse("Ephesians", 7, 1), RangeError);
});

test("dynamicVerse throws if a chapter is given for a single-chapter book", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(() => b.dynamicVerse("Jude", 1, 9), /has only one chapter/);
});

test("dynamicVerse throws if no chapter is given for a multi-chapter book", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(
    () => (b as any).dynamicVerse("Ephesians", [4, 5]),
    /requires a chapter argument/,
  );
});

test("dynamicWholeChapter refuses single-chapter books", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(() => b.dynamicWholeChapter("Jude", 1), /no documented "whole book"/);
});

test("verseRange serializes a range spanning two chapters", () => {
  const s = new VerseReferenceBuilder()
    .verseRange("John", { chapter: 1, verse: 30 }, { chapter: 2, verse: 5 })
    .build();
  assert.equal(s, "John 1:30-2:5");
});

test("verseRange respects useAbbreviations", () => {
  const s = new VerseReferenceBuilder()
    .verseRange("Ephesians", { chapter: 1, verse: 1 }, { chapter: 2, verse: 3 })
    .build({ useAbbreviations: true });
  assert.equal(s, "Eph. 1:1-2:3");
});

test("dynamicVerseRange resolves abbreviations and validates chapter bounds", () => {
  const s = new VerseReferenceBuilder()
    .dynamicVerseRange("eph.", { chapter: 1, verse: 1 }, { chapter: 2, verse: 3 })
    .build();
  assert.equal(s, "Ephesians 1:1-2:3");
});

test("dynamicVerseRange throws on an out-of-range chapter", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(
    () => b.dynamicVerseRange("Ephesians", { chapter: 1, verse: 1 }, { chapter: 7, verse: 1 }),
    RangeError,
  );
});

test("dynamicVerseRange refuses single-chapter books", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(
    () => b.dynamicVerseRange("Jude", { chapter: 1, verse: 1 }, { chapter: 1, verse: 5 }),
    /isn't meaningful/,
  );
});

test("resolveBookName tolerates trailing-period-optional abbreviations", () => {
  assert.equal(resolveBookName("Rev."), "Revelation");
  assert.equal(resolveBookName("rev"), "Revelation");
  assert.equal(resolveBookName("REVELATION"), "Revelation");
  assert.equal(resolveBookName("1 cor."), "1 Corinthians");
  assert.equal(resolveBookName("1 cor"), "1 Corinthians");
});

test("resolveBookName handles Song of Solomon's two-period abbreviation (S.S.)", () => {
  // The only abbreviation in bookData.ts with more than one period — the
  // trailing-period-stripping logic only strips a single trailing
  // character, so this confirms "s.s" (missing only the final period)
  // still resolves, not just the abbreviation given verbatim.
  assert.equal(resolveBookName("S.S."), "Song of Solomon");
  assert.equal(resolveBookName("s.s."), "Song of Solomon");
  assert.equal(resolveBookName("s.s"), "Song of Solomon");
  assert.equal(resolveBookName("SONG OF SOLOMON"), "Song of Solomon");
});

test("validate() sums explicit verse counts and flags the 50-verse cap", () => {
  const b = new VerseReferenceBuilder().verse("Psalms", 119, { from: 1, to: 60 });
  const result = b.validate();
  assert.equal(result.verseCount, 60);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0]!, /50-verse/);
});

test("validate() computes an exact whole-chapter verse count from the supplied data", () => {
  // Psalms 119 has 176 verses live (confirmed against the Recovery
  // Version reader site's own verse anchors — see bookData.ts's doc
  // comment) — no longer an unknowable lower bound.
  const b = new VerseReferenceBuilder().wholeChapter("Psalms", 119);
  const result = b.validate();
  assert.equal(result.verseCount, 176);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0]!, /50-verse/);
});

test("validate() computes an exact cross-chapter-range verse count from the supplied data", () => {
  // John 1 has 51 verses: verses 30-51 (22 verses) plus John 2:1-5 (5 verses) = 27.
  const b = new VerseReferenceBuilder().verseRange(
    "John",
    { chapter: 1, verse: 30 },
    { chapter: 2, verse: 5 },
  );
  const result = b.validate();
  assert.equal(result.verseCount, 27);
  assert.deepEqual(result.warnings, []);
});

test("validate() is clean for a small request", () => {
  const b = new VerseReferenceBuilder().verse("John", 1, 14);
  const result = b.validate();
  assert.equal(result.verseCount, 1);
  assert.deepEqual(result.warnings, []);
});

test("verse() throws a RangeError for a verse that doesn't exist in the chapter", () => {
  // Jude has only 25 verses.
  const b = new VerseReferenceBuilder();
  assert.throws(() => b.verse("Jude", 26), RangeError);
  assert.throws(() => b.verse("John", 1, 52), RangeError); // John 1 has 51 verses
});

test("dynamicVerse throws a RangeError for a verse that doesn't exist in the chapter", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(() => b.dynamicVerse("eph.", 1, 24), RangeError); // Ephesians 1 has 23 verses
});

test("verseRange throws a RangeError if either endpoint's verse doesn't exist", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(
    () => b.verseRange("John", { chapter: 1, verse: 52 }, { chapter: 2, verse: 5 }),
    RangeError,
  );
  assert.throws(
    () => b.verseRange("John", { chapter: 1, verse: 30 }, { chapter: 2, verse: 26 }),
    RangeError,
  );
});

test("dynamicVerseRange throws a RangeError if either endpoint's verse doesn't exist", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(
    () => b.dynamicVerseRange("John", { chapter: 1, verse: 52 }, { chapter: 2, verse: 5 }),
    RangeError,
  );
});

// --- Range order validation ---

test("verse() throws a RangeError for a reversed same-chapter range", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(() => b.verse("John", 1, { from: 10, to: 3 }), RangeError);
});

test("dynamicVerse throws a RangeError for a reversed same-chapter range", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(() => b.dynamicVerse("John", 1, { from: 10, to: 3 }), RangeError);
});

test("verseRange throws a RangeError when the \"to\" chapter comes before the \"from\" chapter", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(
    () => b.verseRange("John", { chapter: 5, verse: 10 }, { chapter: 2, verse: 3 }),
    RangeError,
  );
});

test("verseRange throws a RangeError for a reversed range within the same chapter", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(
    () => b.verseRange("John", { chapter: 1, verse: 30 }, { chapter: 1, verse: 5 }),
    RangeError,
  );
});

test("verseRange allows the same chapter on both endpoints when verses are in order", () => {
  const s = new VerseReferenceBuilder()
    .verseRange("John", { chapter: 1, verse: 5 }, { chapter: 1, verse: 30 })
    .build();
  assert.equal(s, "John 1:5-1:30");
});

test("dynamicVerseRange throws a RangeError when the \"to\" chapter comes before the \"from\" chapter", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(
    () => b.dynamicVerseRange("John", { chapter: 5, verse: 10 }, { chapter: 2, verse: 3 }),
    RangeError,
  );
});

test("dynamicVerseRange throws a RangeError for a reversed range within the same chapter", () => {
  const b = new VerseReferenceBuilder();
  assert.throws(
    () => b.dynamicVerseRange("John", { chapter: 1, verse: 30 }, { chapter: 1, verse: 5 }),
    RangeError,
  );
});
