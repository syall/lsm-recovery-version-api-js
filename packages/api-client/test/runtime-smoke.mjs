// Package-specific half of the shared runtime-interoperability harness
// (../../../scripts/smoke-test-esm.mjs). Imports the *built* dist/esm
// output (exactly as a real ESM consumer would) and exercises
// getVerses() against a stubbed fetch. Deliberately written with only
// standard Web/JS APIs (no Node-specific imports) so the identical
// file runs unmodified under Node, Bun, and Deno — see the
// "runtime-bun" / "runtime-deno" CI jobs in .github/workflows/ci.yml.
//
// This only needs `npm run build:esm` to have been run first (not the
// full build), since it imports dist/esm directly.
import { LsmRecoveryVersionClient } from "../dist/esm/index.js";

const calls = [];
const fetchImpl = async (input, init) => {
  calls.push({ url: String(input), init });
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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });
const result = await client.getVerses({ string: "John 1:14" });

assertEqual(calls.length, 1, "expected exactly one fetch call");
assertEqual(calls[0].init.method, "GET", "expected a GET request");
assertEqual(result.detected, "John 1:14", "unexpected detected reference");
assertEqual(result.verses.length, 1, "unexpected verse count");
assertEqual(result.verses[0].text, "In the beginning was the Word...", "unexpected verse text");
assertEqual(result.searchType, "references", "unexpected searchType");

// Confirm the file-token fallback works with no credentials at all —
// this is now the default, not an error (see DIFFERENCES.md).
{
  const fallbackCalls = [];
  const fallbackFetch = async (input, init) => {
    fallbackCalls.push({ url: String(input), init });
    return fetchImpl(input, init);
  };
  const fallbackClient = new LsmRecoveryVersionClient({ fetch: fallbackFetch });
  await fallbackClient.getVerses({ string: "John 1:14" });
  const url = new URL(fallbackCalls[0].url);
  if (!url.searchParams.has("file")) {
    throw new Error("expected the no-credentials client to send a file= query parameter");
  }
  if (fallbackCalls[0].init.headers && fallbackCalls[0].init.headers.Authorization) {
    throw new Error("expected the no-credentials client not to send an Authorization header");
  }
}

// Confirm the mandatory-credentials validation (IncompleteCredentialsError)
// still fires for a *partial* config — exactly one of appId/token — while
// an empty config no longer throws (it uses the file-token fallback above).
for (const badConfig of [{ appId: "only-one" }, { token: "only-one" }]) {
  let threw = false;
  try {
    new LsmRecoveryVersionClient(badConfig);
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(
      `expected constructing with ${JSON.stringify(badConfig)} to throw IncompleteCredentialsError`,
    );
  }
}
{
  let threw = false;
  try {
    new LsmRecoveryVersionClient({});
  } catch {
    threw = true;
  }
  if (threw) {
    throw new Error("expected constructing with {} to NOT throw (file-token fallback)");
  }
}
