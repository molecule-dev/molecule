# @molecule/api-feed-rss

RSS / Atom / JSON Feed **producer** for molecule.dev — pure-function
serializers that turn a single normalized {@link Feed} structure into
a valid RSS 2.0, Atom 1.0, or JSON Feed 1.1 document.

Companion to `@molecule/api-feed-rss-parser` (the consumer side). Both
packages share a similar normalized shape, so apps can ingest external
feeds, store the items, and re-publish them through this package
without intermediate translation layers.

Apps that use this:
- `blog` — emit `/feed.rss`, `/feed.atom`, `/feed.json` for posts.
- `news-aggregator` — re-publish curated cross-source feeds.
- `podcast` — RSS 2.0 with the iTunes namespace (set `feed.itunes`).

## Type
`utility`

## Installation
```bash
npm install @molecule/api-feed-rss
```

## API

### Interfaces

#### `CreateFeedHandlerOptions`

Configuration for {@link createFeedHandler}.

```typescript
interface CreateFeedHandlerOptions {
  /**
   * Async loader returning the feed snapshot. Called whenever the cache is
   * cold or expired. Must throw on data-source failure — the handler then
   * returns `503 Service Unavailable`.
   */
  loadFeed: () => Promise<Feed> | Feed

  /**
   * Cache TTL in milliseconds. Defaults to `60_000` (1 minute). Set to
   * `0` to disable caching (every request re-loads).
   */
  cacheTtlMs?: number

  /**
   * Map of URL-suffix → {@link FeedOutputFormat}.
   *
   * Defaults to `{ rss: 'rss-2.0', atom: 'atom-1.0', json: 'json-feed' }`.
   *
   * The handler reads the request path's extension via {@link FeedRequest.extension}
   * (callers compute this from the URL — see the function-level docs).
   */
  extensions?: Record<string, FeedOutputFormat>

  /**
   * Optional logger called on errors. Defaults to a no-op.
   */
  onError?: (err: unknown) => void
}
```

#### `Feed`

Feed-level metadata + items, format-agnostic input shape consumed by
every serializer.

```typescript
interface Feed {
  /** Channel / feed title. Required. */
  title: string

  /** Canonical website URL (NOT the feed self-link). Required. */
  link: string

  /** Long-form description / subtitle / tagline. Required by RSS 2.0. */
  description: string

  /** Self-referential URL of the feed document. Recommended for Atom + JSON Feed. */
  feedUrl?: string

  /** RFC 5646 / BCP 47 language tag (e.g. `en`, `en-US`). */
  language?: string

  /** ISO 8601 / `Date` of the feed's last update. Defaults to "now" for Atom. */
  updatedAt?: string | Date

  /** Channel author(s). */
  authors?: FeedAuthor[]

  /** Copyright / rights statement. */
  copyright?: string

  /** Channel image / logo / icon URL. */
  imageUrl?: string

  /** Channel-level categories (RSS only). */
  categories?: string[]

  /**
   * Channel-level iTunes podcast metadata. Presence of this field switches
   * the RSS 2.0 serializer into "podcast mode" — it declares
   * `xmlns:itunes` and emits per-item `<itunes:*>` elements.
   */
  itunes?: FeedChannelItunes

  /** Items in display order. The serializer does not re-sort by date. */
  items: FeedItem[]
}
```

#### `FeedAuthor`

Author of a feed or item.

```typescript
interface FeedAuthor {
  /** Display name. Required for Atom; optional everywhere else. */
  name: string

  /** Author email address. Optional. */
  email?: string

  /** Author profile / homepage URL. Optional. */
  url?: string

  /** Avatar URL (JSON Feed only). */
  avatarUrl?: string
}
```

#### `FeedChannelItunes`

Channel-level iTunes podcast metadata.

Trigger condition: when present (even as `{}`), the RSS 2.0 serializer
declares the iTunes namespace and emits the configured `<itunes:*>`
channel elements.

```typescript
interface FeedChannelItunes {
  /** Show author / host name (`<itunes:author>`). */
  author?: string

  /** Show owner contact info — both fields required by Apple Podcasts. */
  owner?: {
    /** Owner's display name. */
    name: string
    /** Owner's email address. */
    email: string
  }

  /** Show artwork URL (`<itunes:image href="...">`). 1400x1400+ recommended. */
  imageUrl?: string

  /** Whether the show contains explicit material. */
  explicit?: boolean

  /**
   * iTunes show categories — top-level only (subcategories not currently
   * supported by this serializer).
   */
  categories?: string[]

  /** Long-form show summary. */
  summary?: string

  /** Show type — `episodic` (default) or `serial`. */
  type?: 'episodic' | 'serial'
}
```

#### `FeedItem`

A single feed item / entry / post.

```typescript
interface FeedItem {
  /**
   * Stable, opaque identifier. Required.
   *
   * RSS 2.0 emits this as `<guid>`; Atom as `<id>`; JSON Feed as `id`.
   * If {@link FeedItem.link} is set and `id` looks like an HTTP(S) URL,
   * RSS will mark `<guid isPermaLink="true">`.
   */
  id: string

  /** Item title. Required. */
  title: string

  /** Canonical URL the item points to. */
  link?: string

  /** Short summary / excerpt. Plain text or HTML. */
  summary?: string

  /**
   * Full content body. HTML is allowed; the serializer wraps it in CDATA
   * for RSS / Atom and escapes it for JSON Feed.
   */
  content?: string

  /**
   * Whether {@link FeedItem.content} is HTML (`true`, default) or plain text.
   * Drives JSON Feed `content_html` vs `content_text` selection and Atom
   * `<content type="html">` vs `<content type="text">`.
   */
  contentIsHtml?: boolean

  /** Item author(s). RSS uses the first entry; Atom and JSON Feed list all. */
  authors?: FeedAuthor[]

  /** Publication timestamp. ISO 8601 string or `Date`. */
  publishedAt?: string | Date

  /** Last modification timestamp. ISO 8601 string or `Date`. */
  updatedAt?: string | Date

  /** Tags / categories / keywords. */
  categories?: string[]

  /** Media enclosures (podcast audio, attachments, etc.). */
  enclosures?: FeedItemEnclosure[]

  /** Per-item iTunes podcast metadata. See {@link FeedItemItunes}. */
  itunes?: FeedItemItunes
}
```

#### `FeedItemEnclosure`

Media enclosure (podcast audio, video, image, etc.).

```typescript
interface FeedItemEnclosure {
  /** Direct URL to the media resource. Required. */
  url: string

  /**
   * MIME type. Required by RSS 2.0 spec — defaults to
   * `application/octet-stream` when omitted.
   */
  type?: string

  /** Length in bytes. Required by RSS 2.0 spec — defaults to `0` when omitted. */
  length?: number

  /** Display title or alt text. JSON Feed only. */
  title?: string

  /** Duration in seconds. Used by JSON Feed `attachments[].duration_in_seconds`. */
  durationSeconds?: number
}
```

#### `FeedItemItunes`

Optional iTunes podcast metadata for an item.

When supplied AND the channel-level {@link Feed.itunes} block is also
present, the RSS 2.0 serializer emits the iTunes podcast namespace
(`xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"`) and per-item
`<itunes:duration>`, `<itunes:author>`, `<itunes:explicit>`,
`<itunes:image>`, `<itunes:episode>`, `<itunes:season>`, `<itunes:summary>`
elements.

```typescript
interface FeedItemItunes {
  /** Episode duration in seconds. Serialized as HH:MM:SS. */
  durationSeconds?: number

  /** Episode artwork URL. Emitted as `<itunes:image href="...">`. */
  imageUrl?: string

  /** Author display name (overrides item-level `<itunes:author>`). */
  author?: string

  /** Whether the episode contains explicit material. */
  explicit?: boolean

  /** Episode number within the season / series. */
  episode?: number

  /** Season number. */
  season?: number

  /** Plain-text episode summary (`<itunes:summary>`). */
  summary?: string
}
```

#### `FeedRequest`

Minimal request shape consumed by the generated handler.

```typescript
interface FeedRequest {
  /**
   * URL extension portion — `'rss'`, `'atom'`, `'json'`, or any custom key
   * the caller wired in {@link CreateFeedHandlerOptions.extensions}.
   *
   * Callers compute this from the request URL (e.g.
   * `req.path.split('.').pop()` for Express).
   */
  extension: string

  /** Optional `If-None-Match` ETag value, for 304 short-circuiting. */
  ifNoneMatch?: string
}
```

#### `FeedResponse`

Minimal response shape returned by the handler. Framework adapters map
this onto their native response API (`res.status().set().send()` for
Express, `new Response(body, { status, headers })` for fetch, etc.).

```typescript
interface FeedResponse {
  /** HTTP status code: `200` / `304` / `404` / `503`. */
  status: number

  /** Headers — always includes `Content-Type` on `200`. */
  headers: Record<string, string>

  /** Body — empty string on `304` / `404` / errors. */
  body: string
}
```

#### `SerializeAtom1Options`

Options controlling {@link serializeAtom1}.

```typescript
interface SerializeAtom1Options {
  /** XML declaration. Defaults to `<?xml version="1.0" encoding="UTF-8"?>`. */
  xmlDeclaration?: string
  /** Pretty-print with 2-space indentation. Defaults to `true`. */
  pretty?: boolean
}
```

#### `SerializeJsonFeedOptions`

Options controlling {@link serializeJsonFeed}.

```typescript
interface SerializeJsonFeedOptions {
  /** Pretty-print with 2-space indentation. Defaults to `false`. */
  pretty?: boolean
}
```

#### `SerializeRss2Options`

Options controlling {@link serializeRss2}.

```typescript
interface SerializeRss2Options {
  /** XML declaration. Defaults to `<?xml version="1.0" encoding="UTF-8"?>`. */
  xmlDeclaration?: string
  /** Pretty-print with 2-space indentation. Defaults to `true`. */
  pretty?: boolean
}
```

### Types

#### `FeedOutputFormat`

Output format discriminator for {@link serializeFeed} and the
{@link createFeedHandler} HTTP handler.

- `rss-2.0` — RSS 2.0 XML, served as `application/rss+xml`.
- `atom-1.0` — Atom 1.0 XML, served as `application/atom+xml`.
- `json-feed` — JSON Feed 1.1, served as `application/feed+json`.

```typescript
type FeedOutputFormat = 'rss-2.0' | 'atom-1.0' | 'json-feed'
```

### Classes

#### `FeedSerializeError`

Error raised when the {@link Feed} input fails minimum-viability checks
(missing required `title` / `link` / `description`, missing item `id` or
`title`, etc.).

### Functions

#### `assertFeedShape(feed, format)`

Validate {@link Feed} input has the minimum required fields for the
given output format.

```typescript
function assertFeedShape(feed: Feed, format: FeedOutputFormat): void
```

- `feed` — Feed input.
- `format` — Target serialization format.

#### `createFeedHandler(options)`

Create a framework-agnostic feed HTTP handler with built-in TTL caching.

The returned handler accepts a {@link FeedRequest} and returns a
{@link FeedResponse}. It serves three formats by default — RSS 2.0,
Atom 1.0, JSON Feed — keyed by URL extension.

**Caching** — feed payloads are cached per-format for `cacheTtlMs`
(default 1 minute). Each cache entry carries an ETag computed from the
payload hash; matching `If-None-Match` triggers a `304` response.

**Error handling** — if `loadFeed` throws, the handler returns `503`
with body `''`. The error is forwarded to `onError` if provided.

**No XSS surface** — all interpolation runs through the underlying
serializers (`serializeRss2` / `serializeAtom1` / `serializeJsonFeed`),
which escape every user-supplied field. The handler itself never
concatenates request data into the response body.

```typescript
function createFeedHandler(options: CreateFeedHandlerOptions): (req: FeedRequest) => Promise<FeedResponse>
```

- `options` — See {@link CreateFeedHandlerOptions}.

**Returns:** Async handler function `(req: FeedRequest) => Promise<FeedResponse>`.

#### `escapeAttr(value)`

Escape an attribute value (alias of {@link escapeXml} kept distinct so
future tightening — e.g. enforcing quote style — has a single call site).

```typescript
function escapeAttr(value: string | number | boolean | null | undefined): string
```

- `value` — Raw attribute value.

**Returns:** Escaped string suitable for `="..."` attribute syntax.

#### `escapeUrl(value)`

Validate + escape a URL for safe use as an `href` / `src` / RSS `<link>`
value. Strips `javascript:` and other dangerous schemes — those are
replaced with `about:blank`.

Allowed schemes (case-insensitive): `http`, `https`, `mailto`, `ftp`,
`tel`, plus protocol-relative (`//...`) and absolute paths (`/...`) and
relative paths (`./...`, `../...`, `name`, `name?...`, `name#...`).

```typescript
function escapeUrl(value: string | null | undefined): string
```

- `value` — Raw URL. `undefined` / `null` collapse to `''`.

**Returns:** Escaped URL or `'about:blank'` for disallowed schemes.

#### `escapeXml(value)`

Escape a string for inclusion in an XML text node or attribute value.

Maps the five XML predefined entities:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&apos;`

Also strips XML 1.0 illegal control characters (`U+0000`–`U+0008`,
`U+000B`, `U+000C`, `U+000E`–`U+001F`). `\t`, `\n`, `\r` are preserved.

```typescript
function escapeXml(value: string | number | boolean | null | undefined): string
```

- `value` — Raw string. `undefined` / `null` collapse to `''`.

**Returns:** Escaped string safe for any XML position.

#### `indent(body, pad)`

Indent each newline of `body` by `pad` spaces. Used for pretty-printing.

```typescript
function indent(body: string, pad: number): string
```

- `body` — Multi-line text. Empty input returns empty string.
- `pad` — Number of spaces to prepend to each line.

**Returns:** Indented text.

#### `looksLikeHttpUrl(value)`

Whether a string looks like an HTTP(S) URL — used to set
`<guid isPermaLink>` and to fall back to `link` for `<id>` synthesis.

```typescript
function looksLikeHttpUrl(value: string | null | undefined): boolean
```

- `value` — Candidate string.

**Returns:** `true` if the value parses as `http:` or `https:` URL.

#### `serializeAtom1(feed, options)`

Serialize a {@link Feed} to a complete Atom 1.0 XML document.

Conforms to RFC 4287:
- Declares `xmlns="http://www.w3.org/2005/Atom"` on the root.
- Always emits required `<id>`, `<title>`, `<updated>` elements.
- Each entry has `<id>`, `<title>`, `<updated>`.
- HTML content is wrapped in CDATA inside `<content type="html">` /
  `<summary type="html">`. Plain-text content uses `type="text"` with
  raw escaping.

**All user-supplied content is escaped** — text fields run through
{@link escapeXml}, attribute values through {@link escapeAttr}, URLs
through {@link escapeUrl} (which neutralizes `javascript:` URIs), and
HTML-bearing fields are CDATA-wrapped via {@link wrapCdata}.

```typescript
function serializeAtom1(feed: Feed, options?: SerializeAtom1Options): string
```

- `feed` — The feed structure to serialize.
- `options` — See {@link SerializeAtom1Options}.

**Returns:** Complete Atom 1.0 XML document string.

#### `serializeFeed(feed, format)`

Serialize a {@link Feed} to the body string for a given output format.

Delegates to {@link serializeRss2} / {@link serializeAtom1} /
{@link serializeJsonFeed}. Useful when callers want a single entry
point keyed by a runtime-determined format (e.g. inside a route
handler dispatching on the URL extension).

```typescript
function serializeFeed(feed: Feed, format: FeedOutputFormat): string
```

- `feed` — The feed structure.
- `format` — Target output format.

**Returns:** Serialized body string.

#### `serializeJsonFeed(feed, options)`

Serialize a {@link Feed} to a complete JSON Feed 1.1 document.

The output conforms to https://www.jsonfeed.org/version/1.1/ — the
entire payload is built as plain JS objects then `JSON.stringify`-ed,
so all string content is naturally JSON-escaped. No CDATA / XML
escaping is applicable.

```typescript
function serializeJsonFeed(feed: Feed, options?: SerializeJsonFeedOptions): string
```

- `feed` — The feed structure to serialize.
- `options` — See {@link SerializeJsonFeedOptions}.

**Returns:** Complete JSON Feed 1.1 document string.

#### `serializeRss2(feed, options)`

Serialize a {@link Feed} to a complete RSS 2.0 XML document.

The output is valid RSS 2.0 — declares the `dc`, `content`, and `atom`
namespaces always, plus `itunes` when {@link Feed.itunes} is present.

**All user-supplied content is escaped** — text fields run through
{@link escapeXml}, attribute values through {@link escapeAttr}, URLs
through {@link escapeUrl} (which neutralizes `javascript:` URIs), and
HTML-bearing fields (`description`, `content:encoded`,
`itunes:summary`) are CDATA-wrapped via {@link wrapCdata} with
`]]>` splitting.

```typescript
function serializeRss2(feed: Feed, options?: SerializeRss2Options): string
```

- `feed` — The feed structure to serialize.
- `options` — See {@link SerializeRss2Options}.

**Returns:** Complete RSS 2.0 XML document string.

#### `toHhMmSs(seconds)`

Format a duration in seconds as `HH:MM:SS`, used for `<itunes:duration>`.

Returns `undefined` for non-finite or negative input.

```typescript
function toHhMmSs(seconds: number | null | undefined): string | undefined
```

- `seconds` — Whole or fractional seconds.

**Returns:** `HH:MM:SS` string or `undefined`.

#### `toIso(value)`

Coerce a `Date` / ISO string / arbitrary string into an ISO 8601 string.

Returns `undefined` if the input is missing or unparseable. Unparseable
arbitrary strings fall back to `undefined` rather than throwing — the
serializer simply omits the timestamp element rather than emitting
`Invalid Date`.

```typescript
function toIso(value: string | Date | null | undefined): string | undefined
```

- `value` — Raw `Date`, ISO string, or other date-like string.

**Returns:** ISO 8601 timestamp (`2026-04-28T15:00:00.000Z`) or `undefined`.

#### `toRfc822(value)`

Coerce a `Date` / ISO string into an RFC 822 date string suitable for
RSS 2.0 `<pubDate>` / `<lastBuildDate>` fields.

Always returns GMT / `+0000`. Returns `undefined` for unparseable input.

```typescript
function toRfc822(value: string | Date | null | undefined): string | undefined
```

- `value` — Raw `Date`, ISO string, or RFC 822 string.

**Returns:** RFC 822 timestamp (`Mon, 28 Apr 2026 15:00:00 GMT`) or `undefined`.

#### `wrapCdata(value)`

Wrap an HTML payload in a `<![CDATA[ ... ]]>` section, splitting any
accidental closing-marker (`]]>`) inside the payload across two CDATA
sections so the result remains valid XML.

Use for `<description>` / `<content:encoded>` / Atom `<content type="html">`
where the body is HTML and we want to avoid double-escaping.

Also strips XML 1.0 illegal control characters before wrapping (`\t`,
`\n`, `\r` preserved). The CDATA payload still cannot contain raw
`<![CDATA[` openers, but those are not produced by typical HTML and
any literal occurrence is treated as ordinary text by browsers.

```typescript
function wrapCdata(value: string | null | undefined): string
```

- `value` — Raw HTML / text. `undefined` / `null` collapse to `''`.

**Returns:** A complete CDATA section, e.g. `<![CDATA[<p>x</p>]]>`.

### Constants

#### `FEED_CONTENT_TYPES`

The MIME type each format is served with.

```typescript
const FEED_CONTENT_TYPES: Record<FeedOutputFormat, string>
```
