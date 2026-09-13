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
 * HTTP 400 — the `String` parameter contained a disallowed character, an
 * unrecognized book/chapter/verse reference, or otherwise didn't conform
 * to the required input format.
 */
export class InvalidInputError extends LsmApiError {
  constructor(status: number, body?: string) {
    super("Invalid verse reference input string.", status, body);
    this.name = "InvalidInputError";
  }
}

/** HTTP 401 — missing or invalid Basic Auth credentials (app id / token). */
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
 * `appId` and/or `token` is missing. LSM's API requires HTTP Basic
 * Authentication on every request (https://api.lsm.org/recver/txo-docs.htm) —
 * there is no anonymous, unauthenticated mode — so both are required and
 * this fails fast rather than sending a request the API would reject
 * anyway.
 */
export class IncompleteCredentialsError extends Error {
  constructor() {
    super("Both `appId` and `token` are required.");
    this.name = "IncompleteCredentialsError";
  }
}
