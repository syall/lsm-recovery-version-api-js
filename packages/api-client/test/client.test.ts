import { test } from "node:test";
import assert from "node:assert/strict";
import { LsmRecoveryVersionClient } from "../src/client.js";
import {
  IncompleteCredentialsError,
  InvalidInputError,
  LsmApiError,
  NetworkError,
  UnauthorizedError,
} from "../src/errors.js";

/**
 * Client-level behavior: URL construction, request headers/method,
 * response parsing, and error mapping. This package has no dependency
 * on @syall/verse-reference-builder — the `string` parameter is always
 * a plain string, built however the caller likes.
 */

const EMPTY_BODY = { inputstring: "", detected: "", verses: [], message: "", copyright: "" };

/** A fetch stub that records every call and defers the response to `handler`. */
function makeCapturingFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const resolvedInit = init ?? {};
    calls.push({ url, init: resolvedInit });
    return handler(url, resolvedInit);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function okResponse(body: unknown = EMPTY_BODY): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

/**
 * Decodes an `Authorization: Basic <base64>` header value back to the
 * original `appId:token` string, independent of which encoding path
 * (Buffer or btoa) produced it — the base64 text itself is identical
 * either way, since both encode the same UTF-8 bytes.
 */
function decodeAuthorizationCredentials(headerValue: string): string {
  const base64 = headerValue.replace(/^Basic /, "");
  return new TextDecoder().decode(Buffer.from(base64, "base64"));
}

// --- Constructor credential validation ---

test("constructs fine with both appId and token provided", () => {
  assert.doesNotThrow(() => new LsmRecoveryVersionClient({ appId: "id", token: "tok" }));
});

test("throws IncompleteCredentialsError when neither appId nor token is provided", () => {
  // Basic Auth is mandatory (see client.ts) — TypeScript itself now blocks
  // this call site, so this simulates an untyped/JS caller who omits both.
  assert.throws(
    () => new LsmRecoveryVersionClient({} as unknown as ConstructorParameters<typeof LsmRecoveryVersionClient>[0]),
    (err: unknown) => {
      assert.ok(err instanceof IncompleteCredentialsError);
      assert.equal(err.name, "IncompleteCredentialsError");
      assert.equal(err.message, "Both `appId` and `token` are required.");
      return true;
    },
  );
});

test("throws IncompleteCredentialsError when only appId is provided", () => {
  assert.throws(
    () =>
      new LsmRecoveryVersionClient({
        appId: "id",
      } as unknown as ConstructorParameters<typeof LsmRecoveryVersionClient>[0]),
    (err: unknown) => {
      assert.ok(err instanceof IncompleteCredentialsError);
      return true;
    },
  );
});

test("throws IncompleteCredentialsError when only token is provided", () => {
  assert.throws(
    () =>
      new LsmRecoveryVersionClient({
        token: "tok",
      } as unknown as ConstructorParameters<typeof LsmRecoveryVersionClient>[0]),
    (err: unknown) => {
      assert.ok(err instanceof IncompleteCredentialsError);
      return true;
    },
  );
});

// --- URL construction ---

test("uses the default base URL (https://api.lsm.org/recver) when none is configured", async () => {
  const { fetchImpl, calls } = makeCapturingFetch(() => okResponse());
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await client.getVerses({ string: "John 1:14" });

  assert.equal(calls.length, 1);
  assert.match(calls[0]!.url, /^https:\/\/api\.lsm\.org\/recver\/txo\.php\?/);
});

test("respects a configured baseUrl override", async () => {
  const { fetchImpl, calls } = makeCapturingFetch(() => okResponse());
  const client = new LsmRecoveryVersionClient({
    appId: "id",
    token: "tok",
    baseUrl: "https://example.test/api",
    fetch: fetchImpl,
  });

  await client.getVerses({ string: "John 1:14" });

  assert.match(calls[0]!.url, /^https:\/\/example\.test\/api\/txo\.php\?/);
});

test("always sets Out=json regardless of other params", async () => {
  const { fetchImpl, calls } = makeCapturingFetch(() => okResponse());
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await client.getVerses({ string: "John 1:14" });

  const url = new URL(calls[0]!.url);
  assert.equal(url.searchParams.get("Out"), "json");
});

test("includes Lang when provided, and omits it otherwise", async () => {
  const { fetchImpl, calls } = makeCapturingFetch(() => okResponse());
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await client.getVerses({ string: "John 1:14", lang: "spa" });
  await client.getVerses({ string: "John 1:14" });

  const withLang = new URL(calls[0]!.url);
  const withoutLang = new URL(calls[1]!.url);
  assert.equal(withLang.searchParams.get("Lang"), "spa");
  assert.equal(withoutLang.searchParams.has("Lang"), false);
});

test("URL-encodes special characters in the String parameter and round-trips them", async () => {
  const { fetchImpl, calls } = makeCapturingFetch(() => okResponse());
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });
  const reference = "Prov. 29:18; Acts 26:19 & 20";

  await client.getVerses({ string: reference });

  const url = new URL(calls[0]!.url);
  assert.equal(url.searchParams.get("String"), reference);
});

// --- Request method / headers ---

test("sends a GET request with an Accept: application/json header", async () => {
  const { fetchImpl, calls } = makeCapturingFetch(() => okResponse());
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await client.getVerses({ string: "John 1:14" });

  assert.equal(calls[0]!.init.method, "GET");
  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.equal(headers.Accept, "application/json");
});

test("sends a Basic Authorization header base64-encoding appId:token", async () => {
  const { fetchImpl, calls } = makeCapturingFetch(() => okResponse());
  const client = new LsmRecoveryVersionClient({ appId: "myid", token: "mytoken", fetch: fetchImpl });

  await client.getVerses({ string: "John 1:14" });

  const headers = calls[0]!.init.headers as Record<string, string>;
  const expected = `Basic ${Buffer.from("myid:mytoken", "utf-8").toString("base64")}`;
  assert.equal(headers.Authorization, expected);
});

test("correctly round-trips Unicode (non-Latin1) credentials in the Authorization header", async () => {
  // Regression test: calling `btoa()` directly on a string containing a
  // code point above U+00FF (e.g. an emoji or accented character) throws
  // InvalidCharacterError. appId/token must be UTF-8 encoded first.
  const { fetchImpl, calls } = makeCapturingFetch(() => okResponse());
  const client = new LsmRecoveryVersionClient({ appId: "app-🎉-é", token: "tok-日本語", fetch: fetchImpl });

  await client.getVerses({ string: "John 1:14" });

  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.match(headers.Authorization, /^Basic /);
  assert.equal(decodeAuthorizationCredentials(headers.Authorization), "app-🎉-é:tok-日本語");
});

test("falls back to btoa-based encoding when Buffer is unavailable, still round-tripping Unicode credentials", async () => {
  // The Authorization header is computed once, synchronously, inside the
  // constructor (see client.ts) — so Buffer only needs to be hidden for
  // that call, not for the actual network round-trip below, which
  // depends on Node's own fetch/Response machinery still having a
  // working `Buffer` global.
  const originalBuffer = (globalThis as Record<string, unknown>).Buffer;
  let client: LsmRecoveryVersionClient;
  const { fetchImpl, calls } = makeCapturingFetch(() => okResponse());
  try {
    delete (globalThis as Record<string, unknown>).Buffer;
    client = new LsmRecoveryVersionClient({ appId: "app-🎉", token: "tok", fetch: fetchImpl });
  } finally {
    (globalThis as Record<string, unknown>).Buffer = originalBuffer;
  }

  await client.getVerses({ string: "John 1:14" });

  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.match(headers.Authorization, /^Basic /);
  assert.equal(decodeAuthorizationCredentials(headers.Authorization), "app-🎉:tok");
});

test("throws when constructing a credentialed client while no base64 encoder (Buffer or btoa) is available", () => {
  const originalBuffer = (globalThis as Record<string, unknown>).Buffer;
  const originalBtoa = (globalThis as Record<string, unknown>).btoa;
  try {
    delete (globalThis as Record<string, unknown>).Buffer;
    delete (globalThis as Record<string, unknown>).btoa;
    assert.throws(() => new LsmRecoveryVersionClient({ appId: "id", token: "tok" }), /No base64 encoder available/);
  } finally {
    (globalThis as Record<string, unknown>).Buffer = originalBuffer;
    (globalThis as Record<string, unknown>).btoa = originalBtoa;
  }
});

test("falls back to the global fetch when no config.fetch is provided", async () => {
  const original = globalThis.fetch;
  let calledWith: string | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calledWith = String(input);
    return okResponse();
  }) as typeof fetch;

  try {
    const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok" });
    await client.getVerses({ string: "John 1:14" });
    assert.match(calledWith ?? "", /^https:\/\/api\.lsm\.org\/recver\/txo\.php\?/);
  } finally {
    globalThis.fetch = original;
  }
});

// --- Response parsing ---

test("getVerses returns the parsed JSON response body as-is", async () => {
  const body = {
    inputstring: "John 1:14",
    detected: "John 1:14",
    verses: [{ ref: "John 1:14", text: "In the beginning was the Word...", urlpfx: "abc" }],
    message: "",
    copyright: "© LSM",
  };
  const { fetchImpl } = makeCapturingFetch(() => okResponse(body));
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  const result = await client.getVerses({ string: "John 1:14" });

  assert.deepEqual(result, body);
});

test("throws LsmApiError carrying the raw body text when a 200 response isn't valid JSON", async () => {
  const { fetchImpl } = makeCapturingFetch(() => new Response("<html>not json</html>", { status: 200 }));
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await assert.rejects(
    () => client.getVerses({ string: "John 1:14" }),
    (err: unknown) => {
      assert.ok(err instanceof LsmApiError);
      assert.equal(err.status, 200);
      assert.equal(err.body, "<html>not json</html>");
      assert.match(err.message, /could not be parsed as JSON/);
      assert.ok(err.cause instanceof Error);
      return true;
    },
  );
});

// --- Network failures ---

test("wraps a rejecting fetch implementation (network failure) in NetworkError", async () => {
  const networkFailure = new TypeError("fetch failed");
  const fetchImpl = (async () => {
    throw networkFailure;
  }) as typeof fetch;
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await assert.rejects(
    () => client.getVerses({ string: "John 1:14" }),
    (err: unknown) => {
      assert.ok(err instanceof NetworkError);
      assert.ok(err instanceof LsmApiError);
      assert.equal(err.name, "NetworkError");
      assert.equal(err.status, 0);
      assert.match(err.message, /fetch failed/);
      assert.equal(err.cause, networkFailure);
      return true;
    },
  );
});

// --- Error mapping ---

test("throws UnauthorizedError on a 401 response, carrying status and body", async () => {
  const { fetchImpl } = makeCapturingFetch(() => new Response("bad credentials", { status: 401 }));
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await assert.rejects(
    () => client.getVerses({ string: "John 1:14" }),
    (err: unknown) => {
      assert.ok(err instanceof UnauthorizedError);
      assert.equal(err.status, 401);
      assert.equal(err.body, "bad credentials");
      assert.equal(err.message, "Missing or invalid app id / token.");
      assert.equal(err.name, "UnauthorizedError");
      return true;
    },
  );
});

test("throws InvalidInputError on a 400 response, carrying status and body", async () => {
  const { fetchImpl } = makeCapturingFetch(() => new Response("unrecognized reference", { status: 400 }));
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await assert.rejects(
    () => client.getVerses({ string: "Not A Book 1:1" }),
    (err: unknown) => {
      assert.ok(err instanceof InvalidInputError);
      assert.equal(err.status, 400);
      assert.equal(err.body, "unrecognized reference");
      assert.equal(err.message, "Invalid verse reference input string.");
      assert.equal(err.name, "InvalidInputError");
      return true;
    },
  );
});

test("throws a generic LsmApiError (not a subclass) on any other error status", async () => {
  const { fetchImpl } = makeCapturingFetch(() => new Response("server exploded", { status: 500 }));
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await assert.rejects(
    () => client.getVerses({ string: "John 1:14" }),
    (err: unknown) => {
      assert.ok(err instanceof LsmApiError);
      assert.equal(err instanceof InvalidInputError, false);
      assert.equal(err instanceof UnauthorizedError, false);
      assert.equal(err.status, 500);
      assert.equal(err.body, "server exploded");
      assert.equal(err.message, "Request failed with status 500");
      return true;
    },
  );
});

test("falls back to an undefined error body when reading the response text fails", async () => {
  const broken = new Response(null, { status: 500 });
  broken.text = async () => {
    throw new Error("stream already consumed");
  };
  const { fetchImpl } = makeCapturingFetch(() => broken);
  const client = new LsmRecoveryVersionClient({ appId: "id", token: "tok", fetch: fetchImpl });

  await assert.rejects(
    () => client.getVerses({ string: "John 1:14" }),
    (err: unknown) => {
      assert.ok(err instanceof LsmApiError);
      assert.equal(err.body, undefined);
      return true;
    },
  );
});
