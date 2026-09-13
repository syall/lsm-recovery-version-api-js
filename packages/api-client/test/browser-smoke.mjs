// Package-specific half of the shared browser-smoke harness
// (../../../scripts/test-browser.mjs) — see that file for the
// launch/engine-selection logic this plugs into. This module owns
// everything that depends on what @syall/lsm-recovery-version-api-js's
// UMD global actually looks like: stubbing window.fetch, loading the
// bundle, and exercising LsmRecoveryVersionClient end to end in a real
// browser. Network-free: fetch is stubbed before the bundle runs, so
// no internet access is needed, only a browser engine to drive.
import assert from "node:assert/strict";

export async function runBrowserSmoke({ page, globalName, bundleSource }) {
  await page.addInitScript(() => {
    window.__fetchCalls = [];
    window.fetch = async (url, init) => {
      window.__fetchCalls.push({ url: String(url), init });
      const body = {
        inputstring: "John 1:14",
        detected: "John 1:14",
        verses: [{ ref: "John 1:14", text: "In the beginning was the Word...", urlpfx: "abc" }],
        message: "",
        copyright: "© LSM",
      };
      return new Response(JSON.stringify(body), { status: 200 });
    };
  });

  await page.goto("about:blank");
  await page.addScriptTag({ content: bundleSource });

  const result = await page.evaluate(async (globalName) => {
    const api = window[globalName];
    if (!api) {
      throw new Error(`window.${globalName} was not defined by the UMD bundle.`);
    }
    const { LsmRecoveryVersionClient } = api;
    const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok" });
    const verses = await client.getVerses({ string: "John 1:14" });
    return { verses, calls: window.__fetchCalls };
  }, globalName);

  assert.equal(result.calls.length, 1, "expected exactly one fetch call");
  assert.match(
    result.calls[0].url,
    /^https:\/\/api\.lsm\.org\/recver\/txo\.php\?/,
    "expected the default base URL to be used",
  );
  assert.equal(result.verses.detected, "John 1:14");
  assert.equal(result.verses.verses.length, 1);
}
