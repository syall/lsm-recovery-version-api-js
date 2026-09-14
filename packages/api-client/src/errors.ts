/** Base error for all LSM API failures. */
export class LsmApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "LsmApiError";
  }
}

/**
 * The `String` parameter contained a disallowed character, an
 * unrecognized book/chapter/verse reference, or otherwise didn't conform
 * to the required input format. LSM's docs don't specify HTTP status
 * codes for any error condition, and a direct test against the live API
 * confirms at least the unauthorized case (see `UnauthorizedError`)
 * returns HTTP 200 rather than a 4xx status, reporting the failure only
 * via the JSON body's `message` field. To cover both possibilities,
 * this is thrown either when the response's HTTP status is literally
 * 400, or when a 200 response's `message` starts with some
 * capitalization of "Error" and isn't the unauthorized case (see
 * `client.ts`'s `request()` and `assertMessageIsNotAnError()`).
 */
export class InvalidInputError extends LsmApiError {
  constructor(status: number, body?: string) {
    super("Invalid verse reference input string.", status, body);
    this.name = "InvalidInputError";
  }
}

/**
 * Missing or invalid Basic Auth credentials (app id / token), or —
 * since this package now falls back to a public `file=` token when no
 * `appId`/`token` is configured (see `LsmClientConfig` in types.ts) —
 * a revoked/invalid `file=` token. LSM's docs don't document HTTP
 * status codes for any error condition, and live testing confirms an
 * unauthorized request returns HTTP 200 (not 401) with an empty
 * `verses` array and a `message` like
 * "Error: You are not authorized to use this API...". This was
 * confirmed identical for two different causes: omitting all
 * credentials, and sending a well-formed but bogus Basic Auth
 * `appId:token` pair — both produce the exact same response. To cover
 * both possibilities, this is thrown either when the response status is
 * literally 401, or when a 200 response's `message` starts with some
 * capitalization of "Error" and mentions being unauthorized (see
 * `client.ts`'s `request()` and `assertMessageIsNotAnError()`).
 */
export class UnauthorizedError extends LsmApiError {
  constructor(status: number, body?: string) {
    super("Missing or invalid app id / token.", status, body);
    this.name = "UnauthorizedError";
  }
}

/**
 * The request never received an HTTP response at all — a DNS failure,
 * TLS error, connection refused/reset, or any other error the fetch
 * implementation itself threw before a `Response` existed. `status` is
 * always `0` since there is no HTTP status to report.
 *
 * Distinguished from the HTTP-response-based subclasses below
 * (`InvalidInputError`, `UnauthorizedError`) so callers who want to
 * special-case network failures (e.g. to retry) can `catch` this
 * specifically, while `error instanceof LsmApiError` still catches
 * every error this package throws from `getVerses()`.
 */
export class NetworkError extends LsmApiError {
  constructor(cause: unknown) {
    super(
      `Request to the LSM API failed before a response was received: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      0,
      undefined,
      { cause },
    );
    this.name = "NetworkError";
  }
}

/**
 * Thrown synchronously by the LsmRecoveryVersionClient constructor when
 * exactly one of `appId`/`token` is supplied. Supplying **both** uses
 * HTTP Basic Authentication, LSM's documented auth scheme
 * (https://api.lsm.org/recver/txo-docs.htm); supplying **neither**
 * (the default) falls back to a public `file=` token the production
 * `text.recoveryversion.bible` widget itself uses, confirmed live to
 * work with no registration — see `LsmClientConfig` in types.ts and
 * DIFFERENCES.md. Supplying only one of the two is always a
 * configuration mistake — there's no partial-credentials mode to fall
 * back into — so this fails fast rather than sending a request that
 * would either be misinterpreted or silently ignore the one field you
 * did set.
 */
export class IncompleteCredentialsError extends Error {
  constructor() {
    super("`appId` and `token` must be supplied together, or not at all (see LsmClientConfig).");
    this.name = "IncompleteCredentialsError";
  }
}
