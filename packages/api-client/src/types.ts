/** Language used to format verse references in the response. */
export type Language = "eng" | "spa";

/** A single verse returned by the API. */
export interface Verse {
  /** Properly formatted reference, e.g. "John 1:14". */
  ref: string;
  /** The verse text. */
  text: string;
  /**
   * URL postfix for building a Recovery Version website/app link
   * (https://text.recoveryversion.bible/<urlpfx>). Not always present
   * on error responses.
   */
  urlpfx?: string;
}

/** Normalized response shape returned by getVerses. */
export interface VersesResponse {
  /** The raw input string as sent to the API. */
  inputstring: string;
  /** The reference string as recognized after normalization. */
  detected: string;
  /** All verses matched by the request. */
  verses: Verse[];
  /** Any processing message (e.g. the 50-verse limit notice). Empty string if none. */
  message: string;
  /**
   * Required attribution string. Per LSM's Terms of Use this MUST be
   * displayed alongside any verses shown to end users.
   */
  copyright: string;
}

/** Parameters for getVerses. */
export interface GetVersesParams {
  /**
   * The verse reference string, e.g.
   * "Prov. 29:18; Acts 26:19; Eph. 4:4-6; Rev. 21:2, 9-10". Maximum 50
   * verses per request.
   *
   * Hand-write this string per LSM's documented grammar
   * (https://api.lsm.org/recver/txo-docs.htm), or build it with the
   * separate `@syall/verse-reference-builder` package and call
   * `.build()` yourself before passing it here — this package
   * intentionally has no dependency on (or awareness of) that builder.
   */
  string: string;
  /** Reference language; defaults to English server-side. */
  lang?: Language;
}

/**
 * Configuration for LsmRecoveryVersionClient.
 *
 * `appId` and `token` are both required: per LSM's documentation
 * (https://api.lsm.org/recver/txo-docs.htm), every request to the API
 * must carry HTTP Basic Authentication — there is no anonymous,
 * unauthenticated mode. The constructor throws
 * `IncompleteCredentialsError` if either is omitted.
 */
export interface LsmClientConfig {
  /** App id generated at api.lsm.org (used as the Basic Auth username). Required. */
  appId: string;
  /** Token assigned to the app at api.lsm.org (used as the Basic Auth password). Required. */
  token: string;
  /** Overrides the default base URL (https://api.lsm.org/recver). */
  baseUrl?: string;
  /** Overrides the global fetch implementation (e.g. for older Node or testing). */
  fetch?: typeof fetch;
}
