# @molecule/api-feed-rss-parser

Pure-function feed parser for molecule.dev — RSS 2.0, Atom 1.0, RSS 1.0
(RDF), and JSON Feed 1.0 / 1.1, normalized into a single `{ feed, items[] }`
shape. Used by `news-aggregator`, `blog`, and `podcast` apps for ingesting
external feeds and dedup'ing items by stable id.

## Quick Start

```ts
import { parseFeed } from '@molecule/api-feed-rss-parser'

const res = await fetch('https://example.com/feed.xml')
const { feed, items } = parseFeed(await res.text(), {
  contentType: res.headers.get('content-type') ?? undefined,
})

for (const item of items) {
  console.log(item.id, item.title, item.publishedAt)
  for (const enclosure of item.enclosures ?? []) {
    console.log(' ↳', enclosure.url, enclosure.type, enclosure.durationSeconds)
  }
}
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-feed-rss-parser fast-xml-parser
```

## API

### Interfaces

#### `FeedEnclosure`

A normalized media enclosure attached to a feed item (podcast audio,
video, image, etc.). Source: RSS `<enclosure>`, Atom `<link rel="enclosure">`,
JSON Feed `attachments[]`.

```typescript
interface FeedEnclosure {
  /** Direct URL to the media resource. Required. */
  url: string

  /** MIME type (e.g. `audio/mpeg`, `video/mp4`, `image/png`) when known. */
  type?: string

  /** Length in bytes when reported by the source feed. */
  length?: number

  /** Display title or alt text for the enclosure when supplied. */
  title?: string

  /** Duration in seconds — derived from iTunes `<itunes:duration>` for podcasts. */
  durationSeconds?: number
}
```

#### `NormalizedFeed`

Normalized feed-level metadata. The exact subset of fields populated
depends on what the source feed publishes; only `title` is guaranteed.

```typescript
interface NormalizedFeed {
  /** Feed/channel title. Empty string if the source omitted a title. */
  title: string

  /** Long-form description / subtitle / tagline. */
  description?: string

  /** Canonical website URL (NOT the feed self-link). */
  link?: string

  /** Self-referential URL of the feed document, when supplied. */
  feedUrl?: string

  /** RFC 5646 / BCP 47 language tag (e.g. `en`, `en-US`). */
  language?: string

  /** ISO 8601 timestamp of the feed's last update. */
  updatedAt?: string

  /** Author / managing editor name reported by the feed. */
  author?: string

  /** Copyright notice / rights statement. */
  copyright?: string

  /** Feed-level image / logo / icon URL. */
  imageUrl?: string

  /** Detected source format. */
  format: FeedFormat
}
```

#### `NormalizedFeedItem`

Normalized feed item. The exact subset of fields populated depends on
what the source feed publishes; only `id` is guaranteed (synthesized from
`link` or content hash if no GUID is present).

```typescript
interface NormalizedFeedItem {
  /**
   * Stable, opaque identifier for deduplication.
   * Source-of-truth order: `<guid>` / `<id>` / JSON Feed `id` →
   * `link` URL → SHA-1 hash of `title + publishedAt`. Always non-empty.
   */
  id: string

  /** Item title. Empty string if the source omitted a title. */
  title: string

  /** Canonical URL the item points to. */
  link?: string

  /** Short summary / description / excerpt — sanitized HTML or plain text. */
  summary?: string

  /**
   * Full content body — sanitized HTML (`<script>` tags stripped at minimum).
   * Source: `<content:encoded>`, Atom `<content>`, JSON Feed `content_html`/`content_text`.
   */
  content?: string

  /** Author display name reported by the item. */
  author?: string

  /** ISO 8601 timestamp of publication. */
  publishedAt?: string

  /** ISO 8601 timestamp of the last update / modification. */
  updatedAt?: string

  /** Tags / categories / keywords assigned to the item. */
  categories?: string[]

  /** Attached media (podcast audio, embedded images, etc.). */
  enclosures?: FeedEnclosure[]
}
```

#### `ParsedFeed`

Parsed feed result returned by {@link parseFeed}.

```typescript
interface ParsedFeed {
  /** Normalized feed-level metadata. */
  feed: NormalizedFeed

  /** Items in source order (NOT re-sorted by date). */
  items: NormalizedFeedItem[]
}
```

#### `ParseFeedOptions`

Options controlling {@link parseFeed} behavior.

```typescript
interface ParseFeedOptions {
  /**
   * Hint for the source format. When omitted, format detection runs:
   * 1. If `contentType` includes `json` or body trims to `{` / `[` → JSON Feed.
   * 2. XML is parsed and the root element selects `rss-2.0` / `atom-1.0` / `rdf-1.0`.
   *
   * Pass `contentType` from the HTTP response when available; it short-circuits
   * the JSON vs. XML guess on ambiguous payloads.
   */
  contentType?: string

  /**
   * Optional explicit format override. Skips detection entirely.
   */
  format?: FeedFormat

  /**
   * When `true` (default), strips `<script>` blocks from any HTML content
   * fields (`summary`, `content`). Set to `false` only when the caller
   * performs sanitization downstream.
   */
  sanitizeHtml?: boolean
}
```

### Types

#### `FeedFormat`

Discriminator for the source feed format detected by {@link parseFeed}.

- `rss-2.0` — RSS 2.0 (`<rss version="2.0"><channel>...`)
- `atom-1.0` — Atom 1.0 (`<feed xmlns="http://www.w3.org/2005/Atom">...`)
- `rdf-1.0` — RSS 1.0 / RDF (`<rdf:RDF ...><channel>...<item>`)
- `json-feed` — JSON Feed 1.0 / 1.1 (https://www.jsonfeed.org/version/1.1/)

```typescript
type FeedFormat = 'rss-2.0' | 'atom-1.0' | 'rdf-1.0' | 'json-feed'
```

### Classes

#### `FeedParseError`

Error raised when {@link parseFeed} cannot determine the source format
or the body is malformed.

### Functions

#### `detectFeedFormat(body, contentType)`

Detect the source format of a feed body.

Detection runs in this order:
1. If `contentType` includes `json`, OR the trimmed body begins with `{`/`[`,
   return `'json-feed'` without parsing XML.
2. Otherwise the XML root element selects the format:
   - `rss` → `'rss-2.0'`
   - `feed` → `'atom-1.0'`
   - `rdf:RDF` (or `RDF`) → `'rdf-1.0'`

```typescript
function detectFeedFormat(body: string, contentType: string | undefined): FeedFormat | undefined
```

- `body` — Raw body string.
- `contentType` — Optional `Content-Type` header value from the HTTP response.

**Returns:** Detected format, or `undefined` when the body cannot be classified.

#### `parseFeed(body, options)`

Parse an RSS / Atom / RDF / JSON Feed body into a normalized
`{ feed, items[] }` shape.

Pure function — no I/O, no state. Pass the response body and (optionally)
the HTTP `Content-Type` header. Format detection is automatic; pass
`options.format` to override.

```typescript
function parseFeed(body: string, options?: ParseFeedOptions): ParsedFeed
```

- `body` — The full HTTP response body. Required, must be non-empty.
- `options` — Parser options. See {@link ParseFeedOptions}.

**Returns:** Normalized feed + items.

#### `sanitizeHtml(html)`

Strip dangerous content from an HTML string. Returns plain text unchanged.

Removes:
- Complete `<script>...</script>` and `<style>...</style>` blocks.
- Stray opening/closing tags of those elements (in malformed HTML).
- Inline event handlers (`onclick="..."`, `onerror="..."`, etc.).
- `javascript:` URLs in `href` / `src` / `xlink:href` / `(form)action`.

Idempotent: `sanitizeHtml(sanitizeHtml(x)) === sanitizeHtml(x)`.

```typescript
function sanitizeHtml(html: string | null | undefined): string | undefined
```

- `html` — HTML or plain-text string. `undefined` and `null` short-circuit to `undefined` so callers can chain safely.

**Returns:** Sanitized HTML string, or `undefined` when the input was nullish.

## Injection Notes

### Runtime Dependencies

- `fast-xml-parser`

The parser is a pure function — it accepts the response body string plus
optional `contentType` / `format` hints and returns a normalized result.
No fetch, no state, no caching: callers fetch the document themselves
(native `fetch` or the bonded `@molecule/api-http` provider) and can
layer `@molecule/api-cache` on top for TTL caching.

iTunes podcast namespace fields (`<itunes:duration>`, `<itunes:author>`,
`<itunes:image>`, `<itunes:category>`) are extracted into the normalized
shape — duration ends up on the matching `<enclosure>` as
`enclosure.durationSeconds`. Dublin Core (`dc:creator`, `dc:date`,
`dc:subject`) is also recognized for RSS 1.0 / RDF feeds.

Item content fields are sanitized by default — `<script>` blocks, inline
event handlers, and `javascript:` URLs are stripped. Pass
`sanitizeHtml: false` to opt out (e.g. when sanitization happens further
down the pipeline).

Item identifiers are derived in priority order: explicit GUID / Atom id /
JSON Feed id → item link URL → SHA-1 of `title + publishedAt`. The result
is always non-empty and stable across re-parses, so deduplication on
`item.id` is safe.
