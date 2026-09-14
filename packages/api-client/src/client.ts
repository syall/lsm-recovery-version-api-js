import { IncompleteCredentialsError, InvalidInputError, LsmApiError, NetworkError, UnauthorizedError } from "./errors.js";
import type { GetVersesParams, LsmClientConfig, VersesResponse } from "./types.js";

const DEFAULT_BASE_URL = "https://api.lsm.org/recver";

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

export class LsmRecoveryVersionClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly authorizationHeader: string;

  constructor(config: LsmClientConfig) {
    if (!config.appId || !config.token) {
      throw new IncompleteCredentialsError();
    }
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = config.fetch ?? fetch;
    this.authorizationHeader = `Basic ${base64EncodeUtf8(`${config.appId}:${config.token}`)}`;
  }

  async getVerses(params: GetVersesParams): Promise<VersesResponse> {
    const res = await this.request(params);
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text) as VersesResponse;
    } catch (cause) {
      throw new LsmApiError("The API response could not be parsed as JSON.", res.status, text, { cause });
    }
    this.assertMessageIsNotAnError(res.status, text, parsed);
    return parsed;
  }

  /**
   * LSM's API can report a hard failure — missing/invalid credentials, a
   * malformed reference string — with an HTTP 200 response rather than a
   * 4xx status; the failure only shows up in the JSON body's `message`
   * field. Confirmed against the live API for the unauthorized case:
   * status 200, `verses: []`, and
   * `message: "Error: You are not authorized to use this API...."`. A
   * non-error `message` (e.g. the 50-verse-limit notice) never starts
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
    url.searchParams.set("String", params.string);
    if (params.lang) url.searchParams.set("Lang", params.lang);
    url.searchParams.set("Out", "json");
    return url.toString();
  }

  private async request(params: GetVersesParams): Promise<Response> {
    const url = this.buildUrl(params);
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: this.authorizationHeader,
    };

    let res: Response;
    try {
      res = await this.fetchImpl(url, { method: "GET", headers });
    } catch (cause) {
      throw new NetworkError(cause);
    }

    if (res.ok) return res;

    const body = await res.text().catch(() => undefined);
    if (res.status === 401) throw new UnauthorizedError(res.status, body);
    if (res.status === 400) throw new InvalidInputError(res.status, body);
    throw new LsmApiError(`Request failed with status ${res.status}`, res.status, body);
  }
}
