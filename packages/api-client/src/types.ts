/**
 * Language used to format verse references in the response.
 *
 * LSM's docs (https://api.lsm.org/recver/txo-docs.htm) document only
 * `"eng"` (default) and `"spa"`. Live testing found the API actually
 * accepts three more values — `"por"`, `"zho"`, `"tag"` — confirmed by
 * requesting the same verse with each and getting back correctly
 * translated Portuguese, Chinese, and Tagalog text (e.g. `Lang=zho` on
 * `John 3:16` returns `"detected": "約 3:16."` and Chinese verse text).
 * These three aren't guessed ISO codes — they're the exact keys LSM's
 * own `text.recoveryversion.bible` reader site uses internally for its
 * multi-language book-abbreviation table (see
 * `bible-chapter-start-verses.json` / the project's findings doc), which
 * is what pointed at them as candidates worth testing live in the first
 * place. Guessing at other plausible codes for the same three languages
 * (`"chi"`, `"zh"`, `"pt"`, `"tl"`) all `500` — so it's specifically
 * these five 3-letter values and nothing else that work, not a general
 * ISO-639 language parameter. See DIFFERENCES.md.
 */
export type Language = "eng" | "spa" | "por" | "zho" | "tag";

/**
 * Which mode the API resolved the `String` parameter into. Confirmed
 * live on every response tested (including error/unauthorized
 * responses) but **not documented anywhere** in LSM's own API docs
 * (https://api.lsm.org/recver/txo-docs.htm) — see DIFFERENCES.md.
 *
 * - `"references"`: `String` was parsed as one or more verse citations
 *   per LSM's documented grammar, e.g. `"John 3:16"` or
 *   `"1 Cor. 15:45; 2 Cor. 3:17, 18"`.
 * - `"words"`: no citation was recognized, so the API fell back to a
 *   full-text search over the whole Bible for the words in `String`.
 *   Observed even for input containing characters the docs claim are
 *   disallowed — there is no separate "invalid input" state, malformed
 *   input just becomes a (possibly empty) word search.
 */
export type SearchType = "references" | "words";

/** A single verse returned by the API. */
export interface Verse {
  /** Properly formatted reference, e.g. "John 1:14". */
  ref: string;
  /** The verse text. */
  text: string;
  /**
   * URL postfix for building a Recovery Version website/app link
   * (https://text.recoveryversion.bible/<urlpfx>). Confirmed live to
   * always be present as a key on every verse entry, though it can be
   * an empty string (`""`) when the entry doesn't correspond to a real
   * verse (e.g. requesting `"Zzz 99:99"` returns
   * `{"ref": " 99:99", "urlpfx": "", "text": "No such reference"}`).
   * Kept optional here regardless, since LSM's own docs omit it from
   * their example response schema entirely.
   */
  urlpfx?: string;
}

/**
 * A `Verse`-shaped entry the API returns for a syntactically well-formed
 * but non-existent reference (an unrecognized book, or a real book with
 * an out-of-range chapter/verse) — confirmed live, not documented
 * anywhere. It's a normal, successful `200` response — `searchType` is
 * still `"references"` and there's no error `message` — with one fake
 * verse standing in for the real result:
 *
 * ```json
 * { "ref": " 99:99", "urlpfx": "", "text": "No such reference" }
 * ```
 *
 * (from `String=Zzz 99:99`, where `Zzz` isn't a recognized book). Nothing
 * in this package flags this for you — `getVerses()` returns it as an
 * ordinary `Verse` in `result.verses`, since from the API's own
 * perspective the request succeeded. If you need to detect this, check
 * for `verse.text === NO_SUCH_REFERENCE_TEXT` (the exact, apparently
 * fixed, sentinel string LSM's API uses) or an empty `verse.urlpfx` on
 * an otherwise-successful response. See DIFFERENCES.md.
 */
export const NO_SUCH_REFERENCE_TEXT = "No such reference";

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
  /** See `SearchType`. */
  searchType: SearchType;
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
   *
   * This isn't restricted to reference syntax, though: if the API
   * doesn't recognize `string` as a citation, it's used as a full-text
   * word search instead (see `SearchType`) — e.g. `"grace"` or
   * `"eternal life"` are valid inputs that return matching verses from
   * anywhere in the Bible, not just a specific reference.
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
