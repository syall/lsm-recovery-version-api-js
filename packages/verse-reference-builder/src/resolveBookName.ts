import { BOOKS } from "./bookData.js";
import type { BookName } from "./types.js";

/**
 * Resolves a free-text book name or abbreviation to a canonical
 * `BookName`, for the runtime ("dynamic") building path where the book
 * isn't known at compile time (e.g. read from a form or database).
 *
 * Matches, case-insensitively:
 *   - the full book name exactly as in bookData.ts ("ephesians" → "Ephesians")
 *   - LSM's documented "recommended abbreviation" exactly, including the
 *     trailing period if present ("eph." → "Ephesians")
 *   - the same abbreviation with a missing trailing period, for
 *     convenience ("eph" → "Ephesians")
 *
 * Deliberately does NOT attempt to recognize abbreviations beyond what
 * LSM documents (e.g. common Bible-software abbreviations like "Jn" or
 * "1Co") — those aren't confirmed to work against the live API, and
 * guessing at aliases risks silently producing input the API rejects.
 * If you need additional aliases, extend this function's alias table
 * explicitly rather than assuming a guess is safe.
 */
export function resolveBookName(input: string): BookName {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  for (const name of Object.keys(BOOKS) as BookName[]) {
    if (name.toLowerCase() === lower) return name;

    const abbr = BOOKS[name].abbr;
    const abbrLower = abbr.toLowerCase();
    if (abbrLower === lower) return name;

    if (abbrLower.endsWith(".") && abbrLower.slice(0, -1) === lower) {
      return name;
    }
  }

  throw new RangeError(
    `Unrecognized book name or abbreviation: "${input}". See the book table ` +
      `in LSM's API documentation (https://api.lsm.org/recver/txo-docs.htm) ` +
      `for the full list of 66 recognized names and abbreviations.`,
  );
}
