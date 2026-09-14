import { versesInChapter } from "./bookData.js";
import type { BookName, VerseCitation, VerseSpec } from "./types.js";

/** The plain numeric verse number a citation like `5` or `"18a"` refers to. */
export function citationNumber(citation: VerseCitation): number {
  return Number(String(citation).replace(/[a-c]$/, ""));
}

/**
 * The character set LSM's documented `String` grammar actually uses:
 * letters (book names/abbreviations, e.g. "Cor."), digits, spaces, and
 * the punctuation the grammar's own examples rely on — `.` (abbreviation
 * periods), `,`/`;` (separating multiple citations/verses), and `-`
 * (verse ranges), e.g. `"Prov. 29:18; Acts 26:19; Eph. 4:4-6; Rev. 21:2, 9-10"`.
 * LSM's docs claim (per `DIFFERENCES.md` row 4) that "using any other
 * kind of character in an input string will result in an error and no
 * output" — live testing found that's not actually true (a disallowed
 * character silently becomes a zero-result word search instead, per
 * `SearchType` in `@syall/lsm-recovery-version-api-js`), but the
 * documented rule is still worth flagging proactively here, since a
 * caller almost certainly didn't intend to fall into word-search mode.
 *
 * Uses the `u` flag so a non-BMP character (e.g. an emoji) is matched
 * whole, as one disallowed codepoint, rather than as two separate
 * (individually meaningless) UTF-16 surrogate halves.
 */
const DISALLOWED_CHARACTER_PATTERN = /[^A-Za-z0-9.,:;\- ]/gu;

/**
 * Returns the distinct characters in `built` (typically a builder's
 * `.build()` output, though any string can be checked) that fall outside
 * LSM's documented `String` grammar (see `DISALLOWED_CHARACTER_PATTERN`
 * above) — empty if none. This is what `VerseReferenceBuilder.validate()`
 * uses internally, and is also exported directly (see the package's
 * `index.ts`) for anyone validating a hand-built or otherwise
 * externally-sourced `String` value that didn't go through this
 * builder. Every book name/abbreviation in `bookData.ts` and every verse
 * citation this package can itself serialize is already plain ASCII
 * within the allowed set, so `validate()` can't currently surface this
 * warning through `VerseReferenceBuilder`'s own public API — it's kept
 * as defense in depth there, the same role `InvalidInputError` plays in
 * `@syall/lsm-recovery-version-api-js`, in case a future book/citation
 * form introduces a character outside this set.
 */
export function findDisallowedCharacters(built: string): string[] {
  const matches = built.match(DISALLOWED_CHARACTER_PATTERN);
  return matches ? Array.from(new Set(matches)) : [];
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
