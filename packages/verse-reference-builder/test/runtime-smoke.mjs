// Package-specific half of the shared runtime-interoperability harness
// (../../../scripts/smoke-test-esm.mjs). Imports the *built* dist/esm
// output (exactly as a real ESM consumer would) and exercises
// VerseReferenceBuilder. Deliberately written with only standard
// Web/JS APIs (no Node-specific imports) so the identical file runs
// unmodified under Node, Bun, and Deno — see the "runtime-bun" /
// "runtime-deno" CI jobs in .github/workflows/ci.yml.
//
// This only needs `npm run build:esm` to have been run first (not the
// full build), since it imports dist/esm directly.
import { VerseReferenceBuilder } from "../dist/esm/index.js";

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const built = new VerseReferenceBuilder()
  .verse("John", 1, 14)
  .verse("Ephesians", 4, { from: 4, to: 6 })
  .verse("Jude", 9)
  .build();
assertEqual(built, "John 1:14; Ephesians 4:4-6; Jude 9", "unexpected built reference string");

const dynamic = new VerseReferenceBuilder().dynamicVerse("eph.", 4, [4, 5, 6]).build();
assertEqual(dynamic, "Ephesians 4:4, 5, 6", "unexpected dynamic-built reference string");

const range = new VerseReferenceBuilder()
  .verseRange("John", { chapter: 1, verse: 30 }, { chapter: 2, verse: 5 })
  .build();
assertEqual(range, "John 1:30-2:5", "unexpected cross-chapter range string");

// validate() now gives an exact count for whole-chapter/cross-chapter-range
// entries too, using the supplied verses-per-chapter table.
const { verseCount } = new VerseReferenceBuilder().wholeChapter("Psalms", 119).validate();
assertEqual(verseCount, 177, "unexpected exact whole-chapter verse count");

// A verse that doesn't exist in the chapter is now rejected at call time.
let threw = false;
try {
  new VerseReferenceBuilder().verse("Jude", 26); // Jude only has 25 verses
} catch (err) {
  threw = err instanceof RangeError;
}
if (!threw) {
  throw new Error("expected verse('Jude', 26) to throw a RangeError");
}
