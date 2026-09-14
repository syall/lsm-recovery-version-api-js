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
        searchType: "references",
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
    const calls = window.__fetchCalls.slice();

    // Also exercise the no-credentials file-token fallback (the default
    // when appId/token are omitted — see DIFFERENCES.md) end to end
    // through the same UMD bundle.
    window.__fetchCalls.length = 0;
    const fallbackClient = new LsmRecoveryVersionClient();
    await fallbackClient.getVerses({ string: "John 1:14" });
    const fallbackCalls = window.__fetchCalls.slice();

    return { verses, calls, fallbackCalls };
  }, globalName);

  assert.equal(result.calls.length, 1, "expected exactly one fetch call");
  assert.match(
    result.calls[0].url,
    /^https:\/\/api\.lsm\.org\/recver\/txo\.php\?/,
    "expected the default base URL to be used",
  );
  assert.equal(result.verses.detected, "John 1:14");
  assert.equal(result.verses.verses.length, 1);
  assert.equal(result.verses.searchType, "references");

  assert.equal(result.fallbackCalls.length, 1, "expected exactly one fetch call for the fallback client");
  const fallbackUrl = new URL(result.fallbackCalls[0].url);
  assert.equal(fallbackUrl.searchParams.has("file"), true, "expected the fallback client to send a file= parameter");
}
