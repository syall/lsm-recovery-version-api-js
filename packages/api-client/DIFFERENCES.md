# Documented vs. observed API behavior

`@syall/lsm-recovery-version-api-js` talks to LSM's "Text Only Holy Bible
Recovery Version API" (`https://api.lsm.org/recver/txo.php`), documented at
https://api.lsm.org/recver/txo-docs.htm. While building/updating this
package, several places were found where the live API's actual behavior
differs from — or simply isn't covered by — that documentation. This
package follows the **observed live behavior** wherever the two disagree,
since that's what callers actually get back.

Everything below was checked directly against the live endpoint (not
inferred from other libraries or assumed from the docs' prose). Requests
used the public `file=` site key described in the first row below; none
used real registered `appId`/`token` credentials.

## Summary table

| # | Behavior | Documented (LSM's docs) | Observed (live API) | Example |
|---|---|---|---|---|
| 1 | Authentication | HTTP Basic Auth with an `appId`/`token` pair registered at api.lsm.org — described as the only way to call the API. | A second, undocumented method also works: a `file=<base64 token>` query parameter. The token used by the production `text.recoveryversion.bible` widget (`d2ViXzBkMWU1NDZhLWI4ZTQtNGEwNy04NDk5LTgzYWFkY2MwZmE2Yw==`, decodes to `web_0d1e546a-b8e4-4a07-8499-83aadcc0fa6c`) is shipped in that site's own public client JS, works with zero registration, and the response is readable cross-origin from any site (no CORS restriction observed). | `GET .../txo.php?file=d2ViXzBkMWU1NDZhLWI4ZTQtNGEwNy04NDk5LTgzYWFkY2MwZmE2Yw==&String=John%203:16&Out=json` → normal `200` with the verse, called from a page on a completely unrelated origin. |
| 2 | HTTP status codes for errors | Not specified for any error condition. | In every case tested, `txo.php` itself never returns a 4xx/5xx for an auth or input problem — always `200`, with the failure (if any) surfaced only in the JSON body's `message` field. (An invalid `Lang` value is the one exception found — see #7.) | Omitting all credentials → `200` with `"message": "Error: You are not authorized..."`, not `401`. |
| 3 | Invalid/bogus credentials vs. missing credentials | Not distinguished in the docs. | Identical response either way: omitting credentials entirely and sending a well-formed but bogus Basic Auth `appId:token` pair both produce the exact same `200` "not authorized" message. | `Authorization: Basic <base64 of "totally-fake-app-id:totally-fake-token">` → same `"Error: You are not authorized..."` message as no `Authorization` header and no `file=` param at all. |
| 4 | Disallowed characters in `String` | "Using any other kind of character in an input string will result in an error and no output." | No error at all — a `200` with `"verses": []`, `"message": ""`, and `"searchType": "words"`. It's silently treated as a (zero-result) word search, not flagged as invalid. | `String=John @#$% 3:16` → `{"detected": ".", "verses": [], "message": "", "searchType": "words"}`. Junk *appended* to an otherwise-valid reference is just ignored instead: `String=John 3:16 😀` still resolves to John 3:16. |
| 5 | Full-text word search mode | Not mentioned anywhere in the docs — the docs describe `String` purely as a citation grammar. | When `String` doesn't resolve to a recognized reference, the API transparently falls back to a full-text search of the whole Bible and returns matching verses, tagged `"searchType": "words"` (vs. `"references"` for a normal citation lookup). See "Word search mode, in detail" below. | `String=grace` → 49 matched verses from Psalms through 1 Corinthians, each shaped exactly like a normal `{ref, text, urlpfx}` entry. |
| 6 | `searchType` response field | Absent from the docs' response schema entirely (both the XML and JSON examples). | Present on **every** response tested, including error/unauthorized responses — always either `"references"` or `"words"`. | The "not authorized" response for `String=John 3:16` still includes `"searchType": "references"`, because the reference is recognized before the auth check fails. |
| 7 | `Lang` values | Documented as `eng` (default) or `spa` only; no stated behavior for anything else. | Three more values also work, returning correctly translated `detected`/`verses[].text`: `por` (Portuguese), `zho` (Chinese), `tag` (Tagalog). Any *other* value — including plausible-looking ISO-style guesses for those same three languages — 500s with an empty body. This is the one case found where the API *does* return a real non-200 HTTP status. See "Undocumented `Lang` values, in detail" below. | `Lang=zho` on `String=John 3:16` → `200`, `"detected": "約 3:16."`, Chinese verse text. `Lang=zh` (a plausible ISO 639-1 guess for the same language) → `500`, empty body. `Lang=xyz` → `500`, empty response body. |
| 8 | `urlpfx` in the response schema | The docs' own example JSON/XML for a successful response omits `urlpfx` from the schema shown (though the field is *named* and described elsewhere in the docs as "URL postfix..."). | Present on every verse entry in every live response tested — including entries for a reference that doesn't actually exist, where it's an empty string rather than a real path. | `String=Zzz 99:99` → `{"ref": " 99:99", "urlpfx": "", "text": "No such reference"}` — the key is present, just empty. |
| 9 | Empty `String=` parameter | Not addressed. | Returns the API's own HTML documentation landing page (a `<!DOCTYPE html>` page linking to https://api.lsm.org/apis.php) — with `Content-Type: application/json` even though the body is HTML, not JSON. Not a `verses.json`-shaped response at all. | `String=&Out=json` → `200`, `content-type: application/json`, body starts `\n<!DOCTYPE html>\n  <head>...`. |

## Word search mode, in detail

None of this is documented; it was reverse-engineered from live responses
to `grace`, `eternal life`, and `the church` (chosen as: one common single
word, one common two-word phrase, and one phrase containing a very common
word that might be treated as a stopword).

- **Matches all query words, not necessarily as an adjacent phrase.**
  `String=eternal life` matches Daniel 12:2 ("life eternal", reversed
  order) and Matthew 18:8 ("...life maimed...eternal fire...", the two
  words unrelated to each other) — not just the literal phrase "eternal
  life".
- **Exact-phrase matches are ranked first; looser matches are appended at
  the end.** For `eternal life`, the first ~40 results are verses
  containing the literal phrase "eternal life"; Daniel 12:2, Matthew 18:8,
  and Romans 2:7 (word-only matches) appear only at the very end of the
  `verses` array, even though Daniel 12:2 is canonically the *first* verse
  in the Bible to use either word.
- **Results are relevance-ranked, not Bible-book order** — unlike
  reference-lookup mode, where `verses` always comes back in the same
  order as the input citations.
- **Common connecting words appear to be ignored.** `String=the church`
  returns verses containing "church" regardless of whether they contain
  "the church" as an exact phrase (e.g. "…the whole church…", "…a local
  church…") — "the" doesn't appear to narrow the result set on its own.
- **It's also what silently absorbs malformed input** — see row 4 above.
  There is no separate "invalid input" search type or error state; a
  query with disallowed characters is just a word search that happens to
  match nothing.

## Undocumented `Lang` values, in detail

LSM's docs only ever mention `eng`/`spa`. The clue that other values might
work came from `main.js`'s embedded book-abbreviation table (extracted in
full as `bible-chapter-start-verses.json` — see the project's findings
doc), where every book has not just `eng`/`spa` abbreviations but also
`por`, `zho`, and `tag` ones, e.g.:

```json
"Joh": { "eng": "John", "spa": "Jn.", "por": "Jo", "zho": "約", "tag": "Jua", ... }
```

That table is for the reader site's own UI, not proof the *API* accepts
those codes as `Lang` values — so each was tried live against
`txo.php`, and all three work exactly like `eng`/`spa` do:

| `Lang` | Result on `String=John 3:16` |
|---|---|
| `por` | `200`, `"detected": "Jo 3:16."`, Portuguese verse text ("Porque Deus amou o mundo...") |
| `zho` | `200`, `"detected": "約 3:16."`, Chinese verse text ("神愛世人...") |
| `tag` | `200`, `"detected": "Jua 3:16."`, Tagalog verse text ("Sapagka't gayon na lamang...") |

To make sure this isn't just a general ISO-639 passthrough, several
plausible alternate codes for the same three languages were also tried —
`chi`, `zh` (Chinese), `pt` (Portuguese), `tl` (Tagalog) — and every one of
them `500`s exactly like a nonsense value (`xyz`) does. So the API
specifically recognizes these five 3-letter values (`eng`, `spa`, `por`,
`zho`, `tag`) — the same ones LSM's own reader site happens to use
internally — and nothing else, rather than accepting a broader set of
standard language codes.

## Confirmed matching documented behavior

For contrast — these were also checked live and match the docs exactly,
so they're implemented as documented rather than flagged as differences:

- **50-verse limit**: requesting 51 verses (`String=John 1`, which has 51
  verses) returns exactly 50, plus
  `"message": "You have exceeded 50 verses, which is the maximum number of verses sent per request. (You requested 51 verses)"`
  — this exact wording matches the docs' own example.
- **Default output format**: omitting `Out=json` returns XML
  (`content-type: application/xml`) with the documented `<request>` root
  element.
- **The book/chapter/abbreviation table**: LSM's published table of all 66
  books, chapter counts, and recommended abbreviations was cross-checked
  against `@syall/verse-reference-builder`'s `bookData.ts` and an
  independently-sourced book table embedded in the
  `text.recoveryversion.bible` reader site's own client JS — all three
  sources agree exactly, with zero mismatches across all 66 books.
