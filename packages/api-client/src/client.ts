import { IncompleteCredentialsError, InvalidInputError, LsmApiError, NetworkError, UnauthorizedError } from "./errors.js";
import type { GetVersesParams, LsmClientConfig, VersesResponse } from "./types.js";

const DEFAULT_BASE_URL = "https://api.lsm.org/recver";

/**
 * The public "site key" the production `text.recoveryversion.bible`
 * widget itself sends as a `file=` query parameter, instead of the HTTP
 * Basic Auth scheme LSM's own docs describe
 * (https://api.lsm.org/recver/txo-docs.htm). Confirmed live (2026): it
 * works with no registered `appId`/`token` at all, and the response is
 * readable cross-origin from any site (no CORS restriction) — see
 * DIFFERENCES.md for how this was found and verified.
 *
 * This is not a secret this package is disclosing — it's shipped
 * as-is in that site's own client-side JS (`list/list.js`) to every
 * visitor's browser, base64-encoded but otherwise unobscured. It also
 * isn't something LSM issued to this package specifically, so treat it
 * as a convenience default rather than a guarantee: LSM could revoke or
 * rate-limit it at any time without notice. Register your own
 * `appId`/`token` at api.lsm.org (and pass both to the constructor) for
 * anything beyond casual/low-volume use.
 */
const DEFAULT_FILE_TOKEN = "d2ViXzBkMWU1NDZhLWI4ZTQtNGEwNy04NDk5LTgzYWFkY2MwZmE2Yw==";

function base64EncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bufferCtor = (globalThis as Record<string, unknown>).Buffer as
    | { from(bytes: Uint8Array): { toString(encoding: string): string } }
    | undefined;
  if (bufferCtor) {
    return bufferCtor.from(bytes).toString("base64");
  }
  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  throw new Error("No base64 encoder available (need Buffer or btoa).");
}

/**
 * How this client authenticates a request, decided once at construction
 * time from `LsmClientConfig` (see its doc comment in types.ts for the
 * exact rule). `"basic"` sends the documented `Authorization: Basic`
 * header; `"file"` sends the live-but-undocumented `file=` query
 * parameter instead (see `DEFAULT_FILE_TOKEN` above).
 */
type AuthMode = { kind: "basic"; header: string } | { kind: "file"; token: string };

export class LsmRecoveryVersionClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly auth: AuthMode;

  constructor(config: LsmClientConfig = {}) {
    const hasAppId = Boolean(config.appId);
    const hasToken = Boolean(config.token);
    if (hasAppId !== hasToken) {
      // Exactly one of the two was supplied — always a configuration
      // mistake, regardless of which auth mode would otherwise apply.
      throw new IncompleteCredentialsError();
    }
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = config.fetch ?? fetch;
    this.auth =
      hasAppId && hasToken
        ? { kind: "basic", header: `Basic ${base64EncodeUtf8(`${config.appId}:${config.token}`)}` }
        : { kind: "file", token: config.fileToken ?? DEFAULT_FILE_TOKEN };
  }

  async getVerses(params: GetVersesParams): Promise<VersesResponse> {
    const res = await this.request(params);
    const text = await res.text();
    let parsed: VersesResponse;
    try {
      parsed = JSON.parse(text) as VersesResponse;
    } catch (cause) {
      throw new LsmApiError("The API response could not be parsed as JSON.", res.status, text, { cause });
    }
    this.assertMessageIsNotAnError(res.status, text, parsed);
    return parsed;
  }

  /**
   * LSM's API can report a hard failure — missing/invalid credentials —
   * with an HTTP 200 response rather than a 4xx status; the failure only
   * shows up in the JSON body's `message` field. Confirmed against the
   * live API for the unauthorized case (both with no credentials at all,
   * and with a well-formed but bogus Basic Auth `appId:token` pair —
   * both produce the identical HTTP 200 response): `verses: []` and
   * `message: "Error: You are not authorized to use this API...."`.
   *
   * The docs additionally claim a malformed/disallowed-character input
   * string "will result in an error and no output" — live testing found
   * the opposite: it comes back as a plain success (`200`, `verses: []`,
   * `message: ""`, `searchType: "words"`), not an `Error:`-prefixed
   * message (see DIFFERENCES.md). No live input has been found that
   * actually produces a non-authorization `Error:` message or a real
   * 4xx status from `txo.php` itself. `InvalidInputError` and this
   * method's handling of it are kept anyway, as defense in depth, in
   * case some other malformed-input case (not yet found) does surface
   * this way, or LSM's behavior changes.
   *
   * A non-error `message` (e.g. the 50-verse-limit notice) never starts
   * with "Error", so this only fires for genuine failures.
   */
  private assertMessageIsNotAnError(status: number, body: string, parsed: VersesResponse): void {
    const message = parsed.message?.trim();
    if (!message || !/^error\b/i.test(message)) return;
    if (/not authorized/i.test(message)) {
      throw new UnauthorizedError(status, body);
    }
    throw new InvalidInputError(status, body);
  }

  private buildUrl(params: GetVersesParams): string {
    const url = new URL(`${this.baseUrl}/txo.php`);
    if (this.auth.kind === "file") {
      url.searchParams.set("file", this.auth.token);
    }
    url.searchParams.set("String", params.string);
    if (params.lang) url.searchParams.set("Lang", params.lang);
    url.searchParams.set("Out", "json");
    return url.toString();
  }

  private async request(params: GetVersesParams): Promise<Response> {
    const url = this.buildUrl(params);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.auth.kind === "basic") {
      headers.Authorization = this.auth.header;
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, { method: "GET", headers });
    } catch (cause) {
      throw new NetworkError(cause);
    }

    if (res.ok) return res;

    // Kept as a safety net: live testing against `txo.php` has not
    // produced a real 401/400 for auth or input errors (both surface via
    // the JSON body's `message` field on an HTTP 200 instead — see
    // `assertMessageIsNotAnError` above and DIFFERENCES.md). LSM's docs
    // don't rule out a genuine HTTP-level error under other conditions
    // (a true server error, an upstream outage, a future API change),
    // so this stays in place rather than being removed just because it
    // hasn't been observed firing yet.
    const body = await res.text().catch(() => undefined);
    if (res.status === 401) throw new UnauthorizedError(res.status, body);
    if (res.status === 400) throw new InvalidInputError(res.status, body);
    throw new LsmApiError(`Request failed with status ${res.status}`, res.status, body);
  }
}
