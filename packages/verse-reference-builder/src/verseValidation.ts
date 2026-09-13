import { versesInChapter } from "./bookData.js";
import type { BookName, VerseCitation, VerseSpec } from "./types.js";

/** The plain numeric verse number a citation like `5` or `"18a"` refers to. */
export function citationNumber(citation: VerseCitation): number {
  return Number(String(citation).replace(/[a-c]$/, ""));
}

function isVerseRangeLike(v: unknown): v is { from: VerseCitation; to: VerseCitation } {
  return typeof v === "object" && v !== null && "from" in v && "to" in v;
}

/**
 * Throws a RangeError if a cited verse number doesn't exist in the given
 * chapter, per the user-supplied verses-per-chapter table (see
 * bookData.ts). `chapter` is 1 for single-chapter books, matching
 * how that table is indexed.
 */
export function assertVerseExists(book: BookName, chapter: number, citation: VerseCitation): void {
  const max = versesInChapter(book, chapter);
  const verseNumber = citationNumber(citation);
  if (!Number.isInteger(verseNumber) || verseNumber < 1 || verseNumber > max) {
    throw new RangeError(
      `${book} chapter ${chapter} has ${max} verses (per the supplied ` +
        `verses-per-chapter data); verse ${citation} doesn't exist.`,
    );
  }
}

/**
 * Throws a RangeError if a same-chapter verse range's endpoints are
 * reversed (e.g. `{ from: 10, to: 3 }`). Called for every VerseRange
 * item inside a VerseSpec — a range is only ever meaningful within one
 * chapter here; a range spanning two chapters goes through
 * `.verseRange()`/`.dynamicVerseRange()` instead, which is checked by
 * `assertCrossChapterRangeOrder` below.
 */
function assertVerseRangeOrder(book: BookName, chapter: number, from: VerseCitation, to: VerseCitation): void {
  const fromNumber = citationNumber(from);
  const toNumber = citationNumber(to);
  if (fromNumber > toNumber) {
    throw new RangeError(
      `${book} chapter ${chapter}: verse range "${from}-${to}" is reversed — ` +
        `"from" (${from}) must not come after "to" (${to}).`,
    );
  }
}

/** Validates every citation named by a VerseSpec against one chapter. */
export function assertVerseSpecExists(book: BookName, chapter: number, spec: VerseSpec): void {
  const items = Array.isArray(spec) ? spec : [spec];
  for (const item of items) {
    if (isVerseRangeLike(item)) {
      assertVerseExists(book, chapter, item.from);
      assertVerseExists(book, chapter, item.to);
      assertVerseRangeOrder(book, chapter, item.from, item.to);
    } else {
      assertVerseExists(book, chapter, item);
    }
  }
}

/**
 * Throws a RangeError if a cross-chapter range's "from" endpoint doesn't
 * come before its "to" endpoint — chapter first, then verse number
 * within the same chapter. Used by `.verseRange()`/`.dynamicVerseRange()`
 * (see VerseReferenceBuilder.ts), which — unlike a same-chapter
 * VerseRange inside a VerseSpec — allow (and require) the two endpoints
 * to name different chapters, so chapter order has to be checked
 * explicitly rather than assumed.
 */
export function assertCrossChapterRangeOrder(
  book: BookName,
  from: { chapter: number; verse: VerseCitation },
  to: { chapter: number; verse: VerseCitation },
): void {
  if (from.chapter > to.chapter) {
    throw new RangeError(
      `${book}: a verse range's "from" chapter (${from.chapter}) must not come after ` +
        `its "to" chapter (${to.chapter}).`,
    );
  }
  if (from.chapter === to.chapter) {
    assertVerseRangeOrder(book, from.chapter, from.verse, to.verse);
  }
}
