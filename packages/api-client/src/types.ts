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
 * Configuration for LsmRecoveryVersionClient. All fields are optional —
 * see the `appId`/`token` doc comments below for what that changes.
 */
export interface LsmClientConfig {
  /**
   * App id generated at api.lsm.org (used as the Basic Auth username).
   *
   * `appId` and `token` must be supplied **together, or not at all**:
   * - **Both supplied**: sent as HTTP Basic Auth (`appid:token`), per
   *   LSM's documented auth scheme
   *   (https://api.lsm.org/recver/txo-docs.htm).
   * - **Neither supplied** (the default — omit both, or omit `config`
   *   entirely): the client falls back to the same public `file=`
   *   query-parameter site key the production
   *   `text.recoveryversion.bible` widget itself uses. Confirmed live
   *   to work with no registration, and to be usable cross-origin (see
   *   `client.ts`'s `DEFAULT_FILE_TOKEN` and DIFFERENCES.md). This key
   *   isn't issued to this package specifically and could be
   *   revoked/rate-limited by LSM without notice — prefer your own
   *   registered `appId`/`token` for anything beyond casual use.
   * - **Exactly one supplied**: the constructor throws
   *   `IncompleteCredentialsError` synchronously — this is always a
   *   configuration mistake, not a valid partial-auth state.
   */
  appId?: string;
  /** Token assigned to the app at api.lsm.org (used as the Basic Auth password). See `appId` above. */
  token?: string;
  /**
   * Overrides the default public `file=` token used when `appId`/
   * `token` are both omitted (see `appId` above). Only meaningful in
   * that no-credentials mode — ignored if `appId`/`token` are supplied,
   * since that mode uses Basic Auth instead. Useful if LSM issues you a
   * different `file=`-style site key directly, or if the built-in
   * default one is ever revoked.
   */
  fileToken?: string;
  /** Overrides the default base URL (https://api.lsm.org/recver). */
  baseUrl?: string;
  /** Overrides the global fetch implementation (e.g. for older Node or testing). */
  fetch?: typeof fetch;
}
