import { BOOKS, versesInChapter } from "./bookData.js";
import { citationNumber } from "./verseValidation.js";
import type { BookName, ChapterVersePoint, VerseCitation, VerseRange, VerseSpec } from "./types.js";

export type Entry =
  | { kind: "verse"; book: BookName; chapter: number | undefined; verse: VerseSpec }
  | { kind: "wholeChapter"; book: BookName; chapter: number }
  | { kind: "crossChapterRange"; book: BookName; from: ChapterVersePoint; to: ChapterVersePoint };

export interface BuildOptions {
  /**
   * Emit LSM's recommended abbreviation (e.g. "Eph.") instead of the
   * full book name ("Ephesians").
   */
  useAbbreviations?: boolean;
}

function isVerseRange(v: VerseCitation | VerseRange): v is VerseRange {
  return typeof v === "object" && v !== null && "from" in v;
}

function formatCitation(v: VerseCitation): string {
  return String(v);
}

function formatCitationOrRange(v: VerseCitation | VerseRange): string {
  return isVerseRange(v)
    ? `${formatCitation(v.from)}-${formatCitation(v.to)}`
    : formatCitation(v);
}

function formatVerseSpec(spec: VerseSpec): string {
  const items = Array.isArray(spec) ? spec : [spec];
  return items.map(formatCitationOrRange).join(", ");
}

function bookToken(book: BookName, useAbbreviations: boolean): string {
  return useAbbreviations ? BOOKS[book].abbr : book;
}

function serializeEntry(entry: Entry, useAbbreviations: boolean): string {
  const token = bookToken(entry.book, useAbbreviations);

  if (entry.kind === "wholeChapter") {
    // "John 1" — book + chapter, no colon, no verse: retrieves the
    // entire chapter. Not offered for single-chapter books (see
    // MultiChapterBook in types.ts) since LSM's docs never demonstrate
    // a "whole single-chapter-book" request form.
    return `${token} ${entry.chapter}`;
  }

  if (entry.kind === "crossChapterRange") {
    // "John 1:30-2:5" — a verse range spanning two chapters.
    return `${token} ${entry.from.chapter}:${formatCitation(entry.from.verse)}-${entry.to.chapter}:${formatCitation(entry.to.verse)}`;
  }

  const isSingleChapter = BOOKS[entry.book].chapters === 1;
  if (isSingleChapter) {
    // Per docs: "Jude 9 is valid, but Jude 1:9 is not valid."
    return `${token} ${formatVerseSpec(entry.verse)}`;
  }

  return `${token} ${entry.chapter}:${formatVerseSpec(entry.verse)}`;
}

export function serialize(entries: readonly Entry[], options: BuildOptions = {}): string {
  const useAbbreviations = options.useAbbreviations ?? false;
  return entries.map((e) => serializeEntry(e, useAbbreviations)).join("; ");
}

/** Sums the number of verses an entry's VerseSpec explicitly names. */
export function countExplicitVerses(spec: VerseSpec): number {
  if (Array.isArray(spec)) {
    return spec.reduce<number>((sum, s) => sum + countExplicitVerses(s), 0);
  }
  if (isVerseRange(spec)) {
    const from = citationNumber(spec.from);
    const to = citationNumber(spec.to);
    return Math.max(0, to - from + 1);
  }
  return 1;
}

/** Sums the verse count of a cross-chapter range using the supplied verses-per-chapter table. */
function countCrossChapterRangeVerses(
  book: BookName,
  from: ChapterVersePoint,
  to: ChapterVersePoint,
): number {
  const fromVerse = citationNumber(from.verse);
  const toVerse = citationNumber(to.verse);

  if (from.chapter === to.chapter) {
    return Math.max(0, toVerse - fromVerse + 1);
  }

  let count = versesInChapter(book, from.chapter) - fromVerse + 1;
  for (let chapter = from.chapter + 1; chapter < to.chapter; chapter++) {
    count += versesInChapter(book, chapter);
  }
  count += toVerse;
  return Math.max(0, count);
}

/**
 * Exact verse count for a single entry, using the user-supplied
 * verses-per-chapter table (see bookData.ts) for whole-chapter
 * and cross-chapter-range entries, whose count previously couldn't be
 * determined at all.
 */
export function countEntryVerses(entry: Entry): number {
  if (entry.kind === "wholeChapter") {
    return versesInChapter(entry.book, entry.chapter);
  }
  if (entry.kind === "crossChapterRange") {
    return countCrossChapterRangeVerses(entry.book, entry.from, entry.to);
  }
  return countExplicitVerses(entry.verse);
}
