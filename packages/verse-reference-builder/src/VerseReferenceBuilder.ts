import { BOOKS } from "./bookData.js";
import { resolveBookName } from "./resolveBookName.js";
import { countEntryVerses, serialize, type BuildOptions, type Entry } from "./serialize.js";
import { assertCrossChapterRangeOrder, assertVerseExists, assertVerseSpecExists } from "./verseValidation.js";
import type {
  BookName,
  ChapterOf,
  ChapterVersePoint,
  MultiChapterBook,
  VerseArgs,
  VerseSpec,
} from "./types.js";

export type {
  BookName,
  ChapterOf,
  ChapterVersePoint,
  MultiChapterBook,
  SingleChapterBook,
  VerseArgs,
  VerseCitation,
  VerseRange,
  VersePartialMarker,
  VerseSpec,
} from "./types.js";
export type { BuildOptions } from "./serialize.js";
export { resolveBookName } from "./resolveBookName.js";
export { BOOKS, versesInChapter } from "./bookData.js";

export interface ValidationResult {
  /**
   * Exact total verse count across every added entry — including
   * whole-chapter and cross-chapter-range entries — computed from the
   * user-supplied verses-per-chapter table (see bookData.ts).
   */
  verseCount: number;
  /** Human-readable warnings, e.g. approaching or past the 50-verse cap. */
  warnings: string[];
}

/**
 * Builds the `String` input parameter documented at
 * https://api.lsm.org/recver/txo-docs.htm for the LSM Text Only Holy
 * Bible Recovery Version API.
 *
 * Two ways to add a verse reference:
 *
 *   - `.verse(book, ...)` / `.wholeChapter(book, chapter)` /
 *     `.verseRange(book, from, to)` — the type-safe path. `book` must
 *     be one of the 66 literal book names (IntelliSense-completed); the
 *     subsequent argument shape and the valid chapter range are both
 *     enforced at compile time based on which book you picked.
 *
 *   - `.dynamicVerse(book, ...)` / `.dynamicWholeChapter(book, chapter)` /
 *     `.dynamicVerseRange(book, from, to)` — the runtime path, for when
 *     the book name/chapter/verse are only known at runtime (e.g. from
 *     a form or database row) and can't be literal types. Performs the
 *     equivalent validation at call time instead, throwing descriptive
 *     errors.
 *
 * Every method that takes a specific verse citation — on both paths —
 * checks it against a user-supplied verses-per-chapter table (see
 * bookData.ts) and throws a RangeError if the verse doesn't
 * exist in that chapter, e.g. `.verse("Jude", 26)` throws immediately
 * since Jude only has 25 verses. Every range (same-chapter `{ from, to }`
 * within `.verse()`/`.dynamicVerse()`, or cross-chapter via
 * `.verseRange()`/`.dynamicVerseRange()`) is also checked for order —
 * `from` must not come after `to` — so a reversed range throws instead
 * of silently serializing into a backwards, invalid reference string.
 *
 * @example Type-safe
 * ```ts
 * new VerseReferenceBuilder()
 *   .verse("John", 1, 14)
 *   .verse("Ephesians", 4, { from: 4, to: 6 })
 *   .verse("Jude", 9) // single-chapter book: no chapter argument
 *   .verseRange("John", { chapter: 1, verse: 30 }, { chapter: 2, verse: 5 })
 *   .build();
 * // "John 1:14; Ephesians 4:4-6; Jude 9; John 1:30-2:5"
 * ```
 *
 * @example Dynamic (runtime-checked)
 * ```ts
 * const row = { book: "eph.", chapter: 4, verses: [4, 5, 6] };
 * new VerseReferenceBuilder()
 *   .dynamicVerse(row.book, row.chapter, row.verses)
 *   .build();
 * ```
 */
export class VerseReferenceBuilder {
  private readonly entries: Entry[] = [];

  /**
   * Adds a verse (or verse range, or comma-separated group of verses
   * within one chapter) for a book known at compile time. Single-chapter
   * books (Obadiah, Philemon, 2 John, 3 John, Jude) take no chapter
   * argument, per the docs' explicit rule that e.g. "Jude 1:9" is
   * invalid — only "Jude 9" is.
   */
  verse<B extends BookName>(book: B, ...args: VerseArgs<B>): this {
    if (BOOKS[book].chapters === 1) {
      const [verseSpec] = args as [VerseSpec];
      assertVerseSpecExists(book, 1, verseSpec);
      this.entries.push({ book, chapter: undefined, kind: "verse", verse: verseSpec });
    } else {
      const [chapter, verseSpec] = args as [number, VerseSpec];
      assertVerseSpecExists(book, chapter, verseSpec);
      this.entries.push({ book, chapter, kind: "verse", verse: verseSpec });
    }
    return this;
  }

  /**
   * Adds a whole-chapter request (e.g. "John 1" — book + chapter, no
   * verse), per the docs' example where omitting a verse number returns
   * every verse in that chapter. Restricted to multi-chapter books:
   * LSM's docs never demonstrate an equivalent form for single-chapter
   * books, so it isn't offered here rather than guessed at.
   */
  wholeChapter<B extends MultiChapterBook>(book: B, chapter: ChapterOf<B>): this {
    this.entries.push({ book, chapter, kind: "wholeChapter" });
    return this;
  }

  /**
   * Adds a verse range spanning two chapters of the same book (e.g.
   * "John 1:30-2:5"), for a book and chapters known at compile time.
   * Restricted to multi-chapter books, since a cross-chapter range
   * isn't meaningful for a book with only one chapter. `from` must not
   * come after `to` (chapter first, then verse within the same
   * chapter) — a reversed range throws a RangeError rather than
   * silently serializing into a backwards, invalid reference string.
   */
  verseRange<B extends MultiChapterBook>(
    book: B,
    from: { chapter: ChapterOf<B>; verse: ChapterVersePoint["verse"] },
    to: { chapter: ChapterOf<B>; verse: ChapterVersePoint["verse"] },
  ): this {
    assertVerseExists(book, from.chapter, from.verse);
    assertVerseExists(book, to.chapter, to.verse);
    assertCrossChapterRangeOrder(book, from, to);
    this.entries.push({ book, kind: "crossChapterRange", from, to });
    return this;
  }

  /**
   * Runtime-checked equivalent of `.verse()`, for book names/chapters/
   * verses only known at runtime. `book` accepts any full name or
   * LSM-documented abbreviation (case-insensitively; see
   * resolveBookName.ts for exactly what's recognized).
   *
   * Call as `dynamicVerse(book, verseSpec)` for single-chapter books, or
   * `dynamicVerse(book, chapter, verseSpec)` otherwise — mirroring
   * `.verse()`'s shape, just checked at runtime instead of compile time.
   */
  dynamicVerse(book: string, chapterOrVerse: number | VerseSpec, verse?: VerseSpec): this {
    const resolved = resolveBookName(book);
    const isSingleChapter = BOOKS[resolved].chapters === 1;

    if (isSingleChapter) {
      if (verse !== undefined) {
        throw new Error(
          `${resolved} has only one chapter. Per LSM's docs, call ` +
            `dynamicVerse("${resolved}", verseSpec) with no chapter argument ` +
            `(e.g. "Jude 9", not "Jude 1:9").`,
        );
      }
      assertVerseSpecExists(resolved, 1, chapterOrVerse as VerseSpec);
      this.entries.push({
        book: resolved,
        chapter: undefined,
        kind: "verse",
        verse: chapterOrVerse as VerseSpec,
      });
      return this;
    }

    if (typeof chapterOrVerse !== "number" || verse === undefined) {
      throw new Error(
        `${resolved} has ${BOOKS[resolved].chapters} chapters and requires a ` +
          `chapter argument: dynamicVerse("${resolved}", chapter, verseSpec).`,
      );
    }

    const maxChapters = BOOKS[resolved].chapters;
    if (!Number.isInteger(chapterOrVerse) || chapterOrVerse < 1 || chapterOrVerse > maxChapters) {
      throw new RangeError(
        `${resolved} has ${maxChapters} chapters (per LSM's docs); ` +
          `${chapterOrVerse} is out of range.`,
      );
    }

    assertVerseSpecExists(resolved, chapterOrVerse, verse);
    this.entries.push({ book: resolved, chapter: chapterOrVerse, kind: "verse", verse });
    return this;
  }

  /** Runtime-checked equivalent of `.wholeChapter()`. */
  dynamicWholeChapter(book: string, chapter: number): this {
    const resolved = resolveBookName(book);
    if (BOOKS[resolved].chapters === 1) {
      throw new Error(
        `${resolved} is a single-chapter book; LSM's docs give no documented ` +
          `"whole book" request form for it, so dynamicWholeChapter() refuses ` +
          `rather than guess at undocumented behavior.`,
      );
    }
    const maxChapters = BOOKS[resolved].chapters;
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > maxChapters) {
      throw new RangeError(
        `${resolved} has ${maxChapters} chapters (per LSM's docs); ${chapter} is out of range.`,
      );
    }
    this.entries.push({ book: resolved, chapter, kind: "wholeChapter" });
    return this;
  }

  /**
   * Runtime-checked equivalent of `.verseRange()`. `book` accepts any
   * full name or LSM-documented abbreviation (case-insensitively).
   * `from` must not come after `to`, checked the same way as
   * `.verseRange()`.
   */
  dynamicVerseRange(book: string, from: ChapterVersePoint, to: ChapterVersePoint): this {
    const resolved = resolveBookName(book);
    const maxChapters = BOOKS[resolved].chapters;

    if (maxChapters === 1) {
      throw new Error(
        `${resolved} is a single-chapter book; a cross-chapter verse range isn't ` +
          `meaningful for it.`,
      );
    }

    for (const [label, point] of [
      ["from", from],
      ["to", to],
    ] as const) {
      if (!Number.isInteger(point.chapter) || point.chapter < 1 || point.chapter > maxChapters) {
        throw new RangeError(
          `${resolved} has ${maxChapters} chapters (per LSM's docs); the "${label}" ` +
            `chapter ${point.chapter} is out of range.`,
        );
      }
    }

    assertVerseExists(resolved, from.chapter, from.verse);
    assertVerseExists(resolved, to.chapter, to.verse);
    assertCrossChapterRangeOrder(resolved, from, to);
    this.entries.push({ book: resolved, kind: "crossChapterRange", from, to });
    return this;
  }

  /**
   * Diagnostics ahead of a real request. LSM enforces a 50-verse cap
   * server-side (soft: truncated results + a warning message, not a
   * rejected request — see the docs' final example). `verseCount` is an
   * exact total — including whole-chapter and cross-chapter-range
   * entries — computed from the user-supplied verses-per-chapter table
   * (see bookData.ts), not an estimate.
   */
  validate(): ValidationResult {
    const warnings: string[] = [];
    const verseCount = this.entries.reduce((sum, entry) => sum + countEntryVerses(entry), 0);

    if (verseCount > 50) {
      warnings.push(
        `${verseCount} verses requested, over LSM's 50-verse cap per request. ` +
          `The API will return a truncated result plus a warning in its ` +
          `"message" field rather than rejecting the request.`,
      );
    }

    return { verseCount, warnings };
  }

  /**
   * Serializes all added entries into the final `String` value. See
   * BuildOptions for abbreviation/quoting options.
   */
  build(options?: BuildOptions): string {
    return serialize(this.entries, options);
  }
}
