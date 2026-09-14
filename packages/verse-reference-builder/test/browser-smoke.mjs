// Package-specific half of the shared browser-smoke harness
// (../../../scripts/test-browser.mjs) — see that file for the
// launch/engine-selection logic this plugs into. This module owns
// everything that depends on what @syall/verse-reference-builder's
// UMD global actually looks like: loading the bundle and exercising
// VerseReferenceBuilder end to end in a real browser.
import assert from "node:assert/strict";

export async function runBrowserSmoke({ page, globalName, bundleSource }) {
  await page.goto("about:blank");
  await page.addScriptTag({ content: bundleSource });

  const result = await page.evaluate((globalName) => {
    const api = window[globalName];
    if (!api) {
      throw new Error(`window.${globalName} was not defined by the UMD bundle.`);
    }
    const { VerseReferenceBuilder } = api;

    let rejectedNonexistentVerse = false;
    try {
      new VerseReferenceBuilder().verse("Jude", 26); // Jude only has 25 verses
    } catch (err) {
      rejectedNonexistentVerse = err instanceof RangeError;
    }

    return {
      basic: new VerseReferenceBuilder()
        .verse("John", 1, 14)
        .verse("Ephesians", 4, { from: 4, to: 6 })
        .verse("Jude", 9)
        .build(),
      range: new VerseReferenceBuilder()
        .verseRange("John", { chapter: 1, verse: 30 }, { chapter: 2, verse: 5 })
        .build(),
      wholeChapterVerseCount: new VerseReferenceBuilder()
        .wholeChapter("Psalms", 119)
        .validate().verseCount,
      rejectedNonexistentVerse,
    };
  }, globalName);

  assert.equal(result.basic, "John 1:14; Ephesians 4:4-6; Jude 9");
  assert.equal(result.range, "John 1:30-2:5");
  assert.equal(result.wholeChapterVerseCount, 176);
  assert.equal(result.rejectedNonexistentVerse, true);
}
