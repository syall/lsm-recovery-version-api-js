/**
 * Book table for all 66 books, keyed by canonical name. `chapters` and
 * `abbr` are transcribed verbatim from the "Book Names and Abbreviations,
 * Chapters, and Verses" table at https://api.lsm.org/recver/txo-docs.htm
 * (fetched 2026) — the ONLY source of chapter-count and abbreviation data
 * in this package, deliberately not supplemented from general Bible
 * knowledge, since a mismatch between this table and what the live API
 * actually accepts would be worse than not encoding it at all.
 *
 * `versesPerChapter`, by contrast, is NOT from LSM's documentation — LSM
 * publishes only chapter counts, not verses per chapter. It's supplied
 * from a separate source (source book names there varied, e.g. "First
 * Samuel" vs. "1 Samuel", "The Gospel According to Matthew" vs.
 * "Matthew", and have been mapped onto this table's keys with no changes
 * to the counts themselves) and every array's length was checked against
 * this same book's `chapters` count — all 66 matched. Each array is
 * 0-indexed by (chapter - 1); e.g. `BOOKS.John.versesPerChapter[0]` is
 * John chapter 1's verse count. It powers `versesInChapter()` below,
 * which is what the rest of this package actually calls.
 *
 * Each `versesPerChapter` array is explicitly widened to `readonly
 * number[]` (rather than left to the `as const` below) so it stays an
 * ordinary array type instead of a 1-to-1 literal tuple type — the outer
 * `as const` still literal-izes `chapters`/`abbr` per book, which is what
 * `ChapterOf<B>`/`SingleChapterBook` in types.ts actually need; the verse
 * counts themselves are only ever consumed at runtime via
 * `versesInChapter()`, so literal-izing them just bloats this package's
 * emitted .d.ts (and IDE hover tooltips) with no type-level benefit.
 */
export const BOOKS = {
  Genesis: {
    chapters: 50,
    abbr: "Gen.",
    versesPerChapter: [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26] as readonly number[],
  },
  Exodus: {
    chapters: 40,
    abbr: "Exo.",
    versesPerChapter: [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38] as readonly number[],
  },
  Leviticus: {
    chapters: 27,
    abbr: "Lev.",
    versesPerChapter: [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34] as readonly number[],
  },
  Numbers: {
    chapters: 36,
    abbr: "Num.",
    versesPerChapter: [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13] as readonly number[],
  },
  Deuteronomy: {
    chapters: 34,
    abbr: "Deut.",
    versesPerChapter: [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12] as readonly number[],
  },
  Joshua: {
    chapters: 24,
    abbr: "Josh.",
    versesPerChapter: [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33] as readonly number[],
  },
  Judges: {
    chapters: 21,
    abbr: "Judg.",
    versesPerChapter: [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25] as readonly number[],
  },
  Ruth: {
    chapters: 4,
    abbr: "Ruth",
    versesPerChapter: [22, 23, 18, 22] as readonly number[],
  },
  "1 Samuel": {
    chapters: 31,
    abbr: "1 Sam.",
    versesPerChapter: [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13] as readonly number[],
  },
  "2 Samuel": {
    chapters: 24,
    abbr: "2 Sam.",
    versesPerChapter: [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25] as readonly number[],
  },
  "1 Kings": {
    chapters: 22,
    abbr: "1 Kings",
    versesPerChapter: [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53] as readonly number[],
  },
  "2 Kings": {
    chapters: 25,
    abbr: "2 Kings",
    versesPerChapter: [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30] as readonly number[],
  },
  "1 Chronicles": {
    chapters: 29,
    abbr: "1 Chron.",
    versesPerChapter: [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30] as readonly number[],
  },
  "2 Chronicles": {
    chapters: 36,
    abbr: "2 Chron.",
    versesPerChapter: [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23] as readonly number[],
  },
  Ezra: {
    chapters: 10,
    abbr: "Ezra",
    versesPerChapter: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44] as readonly number[],
  },
  Nehemiah: {
    chapters: 13,
    abbr: "Neh.",
    versesPerChapter: [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31] as readonly number[],
  },
  Esther: {
    chapters: 10,
    abbr: "Esth.",
    versesPerChapter: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3] as readonly number[],
  },
  Job: {
    chapters: 42,
    abbr: "Job",
    versesPerChapter: [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17] as readonly number[],
  },
  Psalms: {
    chapters: 150,
    abbr: "Psa.",
    versesPerChapter: [7, 12, 9, 9, 13, 11, 18, 10, 21, 18, 8, 9, 7, 8, 6, 12, 16, 51, 15, 10, 14, 32, 7, 11, 23, 13, 15, 10, 12, 13, 25, 12, 22, 23, 29, 13, 41, 23, 14, 18, 14, 12, 5, 27, 18, 12, 10, 15, 21, 24, 20, 10, 7, 8, 24, 14, 12, 12, 18, 13, 9, 13, 12, 11, 14, 21, 8, 36, 37, 6, 24, 21, 29, 24, 11, 13, 21, 73, 14, 20, 17, 9, 19, 13, 14, 18, 8, 19, 53, 18, 16, 16, 5, 23, 11, 13, 12, 10, 9, 6, 9, 29, 23, 35, 45, 48, 44, 14, 32, 8, 10, 10, 9, 8, 18, 19, 2, 29, 177, 8, 9, 10, 5, 9, 6, 7, 6, 7, 9, 9, 4, 19, 4, 4, 21, 26, 9, 9, 25, 14, 11, 8, 13, 16, 22, 10, 20, 14, 9, 6] as readonly number[],
  },
  Proverbs: {
    chapters: 31,
    abbr: "Prov.",
    versesPerChapter: [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31] as readonly number[],
  },
  Ecclesiastes: {
    chapters: 12,
    abbr: "Eccl.",
    versesPerChapter: [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14] as readonly number[],
  },
  "Song of Solomon": {
    chapters: 8,
    abbr: "S.S.",
    versesPerChapter: [17, 17, 11, 16, 16, 13, 13, 14] as readonly number[],
  },
  Isaiah: {
    chapters: 66,
    abbr: "Isa.",
    versesPerChapter: [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 19, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24] as readonly number[],
  },
  Jeremiah: {
    chapters: 52,
    abbr: "Jer.",
    versesPerChapter: [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34] as readonly number[],
  },
  Lamentations: {
    chapters: 5,
    abbr: "Lam.",
    versesPerChapter: [22, 22, 66, 22, 22] as readonly number[],
  },
  Ezekiel: {
    chapters: 48,
    abbr: "Ezek.",
    versesPerChapter: [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35] as readonly number[],
  },
  Daniel: {
    chapters: 12,
    abbr: "Dan.",
    versesPerChapter: [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13] as readonly number[],
  },
  Hosea: {
    chapters: 14,
    abbr: "Hosea",
    versesPerChapter: [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9] as readonly number[],
  },
  Joel: {
    chapters: 3,
    abbr: "Joel",
    versesPerChapter: [20, 32, 21] as readonly number[],
  },
  Amos: {
    chapters: 9,
    abbr: "Amos",
    versesPerChapter: [15, 16, 15, 13, 27, 14, 17, 14, 15] as readonly number[],
  },
  Obadiah: {
    chapters: 1,
    abbr: "Oba.",
    versesPerChapter: [21] as readonly number[],
  },
  Jonah: {
    chapters: 4,
    abbr: "Jonah",
    versesPerChapter: [17, 10, 10, 11] as readonly number[],
  },
  Micah: {
    chapters: 7,
    abbr: "Micah",
    versesPerChapter: [16, 13, 12, 13, 15, 16, 20] as readonly number[],
  },
  Nahum: {
    chapters: 3,
    abbr: "Nahum",
    versesPerChapter: [15, 13, 19] as readonly number[],
  },
  Habakkuk: {
    chapters: 3,
    abbr: "Hab.",
    versesPerChapter: [17, 20, 19] as readonly number[],
  },
  Zephaniah: {
    chapters: 3,
    abbr: "Zeph.",
    versesPerChapter: [18, 15, 20] as readonly number[],
  },
  Haggai: {
    chapters: 2,
    abbr: "Hag.",
    versesPerChapter: [15, 23] as readonly number[],
  },
  Zechariah: {
    chapters: 14,
    abbr: "Zech.",
    versesPerChapter: [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21] as readonly number[],
  },
  Malachi: {
    chapters: 4,
    abbr: "Mal.",
    versesPerChapter: [14, 17, 18, 6] as readonly number[],
  },
  Matthew: {
    chapters: 28,
    abbr: "Matt.",
    versesPerChapter: [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20] as readonly number[],
  },
  Mark: {
    chapters: 16,
    abbr: "Mark",
    versesPerChapter: [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20] as readonly number[],
  },
  Luke: {
    chapters: 24,
    abbr: "Luke",
    versesPerChapter: [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53] as readonly number[],
  },
  John: {
    chapters: 21,
    abbr: "John",
    versesPerChapter: [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25] as readonly number[],
  },
  Acts: {
    chapters: 28,
    abbr: "Acts",
    versesPerChapter: [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31] as readonly number[],
  },
  Romans: {
    chapters: 16,
    abbr: "Rom.",
    versesPerChapter: [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27] as readonly number[],
  },
  "1 Corinthians": {
    chapters: 16,
    abbr: "1 Cor.",
    versesPerChapter: [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24] as readonly number[],
  },
  "2 Corinthians": {
    chapters: 13,
    abbr: "2 Cor.",
    versesPerChapter: [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14] as readonly number[],
  },
  Galatians: {
    chapters: 6,
    abbr: "Gal.",
    versesPerChapter: [24, 21, 29, 31, 26, 18] as readonly number[],
  },
  Ephesians: {
    chapters: 6,
    abbr: "Eph.",
    versesPerChapter: [23, 22, 21, 32, 33, 24] as readonly number[],
  },
  Philippians: {
    chapters: 4,
    abbr: "Phil.",
    versesPerChapter: [30, 30, 21, 23] as readonly number[],
  },
  Colossians: {
    chapters: 4,
    abbr: "Col.",
    versesPerChapter: [29, 23, 25, 18] as readonly number[],
  },
  "1 Thessalonians": {
    chapters: 5,
    abbr: "1 Thes.",
    versesPerChapter: [10, 20, 13, 18, 28] as readonly number[],
  },
  "2 Thessalonians": {
    chapters: 3,
    abbr: "2 Thes.",
    versesPerChapter: [12, 17, 18] as readonly number[],
  },
  "1 Timothy": {
    chapters: 6,
    abbr: "1 Tim.",
    versesPerChapter: [20, 15, 16, 16, 25, 21] as readonly number[],
  },
  "2 Timothy": {
    chapters: 4,
    abbr: "2 Tim.",
    versesPerChapter: [18, 26, 17, 22] as readonly number[],
  },
  Titus: {
    chapters: 3,
    abbr: "Titus",
    versesPerChapter: [16, 15, 15] as readonly number[],
  },
  Philemon: {
    chapters: 1,
    abbr: "Philem.",
    versesPerChapter: [25] as readonly number[],
  },
  Hebrews: {
    chapters: 13,
    abbr: "Heb.",
    versesPerChapter: [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25] as readonly number[],
  },
  James: {
    chapters: 5,
    abbr: "James",
    versesPerChapter: [27, 26, 18, 17, 20] as readonly number[],
  },
  "1 Peter": {
    chapters: 5,
    abbr: "1 Pet.",
    versesPerChapter: [25, 25, 22, 19, 14] as readonly number[],
  },
  "2 Peter": {
    chapters: 3,
    abbr: "2 Pet.",
    versesPerChapter: [21, 22, 18] as readonly number[],
  },
  "1 John": {
    chapters: 5,
    abbr: "1 John",
    versesPerChapter: [10, 29, 24, 21, 21] as readonly number[],
  },
  "2 John": {
    chapters: 1,
    abbr: "2 John",
    versesPerChapter: [13] as readonly number[],
  },
  "3 John": {
    chapters: 1,
    abbr: "3 John",
    versesPerChapter: [14] as readonly number[],
  },
  Jude: {
    chapters: 1,
    abbr: "Jude",
    versesPerChapter: [25] as readonly number[],
  },
  Revelation: {
    chapters: 22,
    abbr: "Rev.",
    versesPerChapter: [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 18, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21] as readonly number[],
  },
} as const;

export type BookTable = typeof BOOKS;

/**
 * The verse count for one specific chapter of a book, read from that
 * book's `versesPerChapter` entry in BOOKS above. `chapter` is 1-indexed,
 * matching every other chapter argument in this package (e.g.
 * `versesInChapter("John", 1)` is John chapter 1's verse count, not
 * `BOOKS.John.versesPerChapter[1]`).
 */
export function versesInChapter(book: keyof typeof BOOKS, chapter: number): number {
  return BOOKS[book].versesPerChapter[chapter - 1] ?? 0;
}
