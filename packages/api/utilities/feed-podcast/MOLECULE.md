# @molecule/api-feed-podcast

Pure-function podcast RSS 2.0 feed serializer for molecule.dev.
Emits the iTunes namespace (`xmlns:itunes`) plus, by default, the
Podcast Index 1.0 namespace (`xmlns:podcast`) for transcripts and
other modern features.

## Quick Start

```ts
import { serializePodcastRss } from '@molecule/api-feed-podcast'

const xml = serializePodcastRss({
  title: 'Synthase Show',
  link: 'https://example.com',
  description: 'Weekly chats about composable TypeScript.',
  author: 'Jane Smith',
  imageUrl: 'https://example.com/cover.jpg',
  categories: [{ text: 'Technology', subText: 'Tech News' }],
  owner: { name: 'Jane Smith', email: 'jane@example.com' },
  type: 'episodic',
  explicit: false,
  episodes: [
    {
      guid: 'ep-001',
      title: 'Pilot',
      description: 'Welcome to the show.',
      publishedAt: '2026-05-01T12:00:00Z',
      durationSeconds: 1830,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeType: 'full',
      enclosure: {
        url: 'https://cdn.example.com/ep-001.mp3',
        length: 12345678,
        type: 'audio/mpeg',
      },
      transcripts: [
        { url: 'https://cdn.example.com/ep-001.vtt', type: 'text/vtt', language: 'en' },
      ],
    },
  ],
})
```

```ts
// HTTP endpoint — Express adapter
import { createPodcastFeedHandler, type Podcast } from '@molecule/api-feed-podcast'

const loadPodcastById = async (id: string): Promise<Podcast | null> => null // your DB lookup
const app = { get(_path: string, _fn: (req: any, res: any) => void): void {} } // your Express app

const handler = createPodcastFeedHandler({
  load: async (id) => loadPodcastById(id),
})

app.get('/podcasts/:id/feed.xml', async (req, res) => {
  const result = await handler({ params: { id: req.params.id } })
  res.status(result.status)
  for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value)
  res.send(result.body)
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-feed-podcast
```

## API

### Interfaces

#### `CreatePodcastFeedHandlerOptions`

Options for {@link createPodcastFeedHandler}.

```typescript
interface CreatePodcastFeedHandlerOptions {
  /** Resolves a {@link Podcast} by id. Required. */
  load: PodcastLoader

  /** Forwarded to {@link serializePodcastRss}. Optional. */
  serializerOptions?: SerializePodcastRssOptions
}
```

#### `Podcast`

Top-level podcast / show metadata + episode collection consumed by
{@link serializePodcastRss}.

```typescript
interface Podcast {
  /** Show title — emitted as `<title>` and used in `<itunes:title>` callers may add separately. */
  title: string

  /** Canonical website URL — emitted as `<link>`. */
  link: string

  /** Show summary — emitted as `<description>` and `<itunes:summary>`. */
  description: string

  /** BCP 47 language tag (e.g. `en-us`). Defaults to `en` when omitted. */
  language?: string

  /** Copyright notice — emitted as `<copyright>`. */
  copyright?: string

  /** Show author / network for `<itunes:author>`. */
  author?: string

  /** Cover-art URL — required by iTunes. Emitted as `<itunes:image>`. */
  imageUrl?: string

  /** One or more iTunes categories. */
  categories?: PodcastCategory[]

  /** When `true`, emits `<itunes:explicit>true</itunes:explicit>` at channel level. */
  explicit?: boolean

  /** Show type — `episodic` (default) or `serial`. */
  type?: PodcastType

  /** Owner contact for the iTunes directory. */
  owner?: PodcastOwner

  /**
   * Self-referential URL for this RSS feed document. Emitted as
   * `<atom:link rel="self" href="..."/>` per the iTunes spec.
   */
  feedUrl?: string

  /** ISO 8601 timestamp of the last build. Defaults to `new Date()`. */
  lastBuildDate?: string

  /** Episodes in display order — typically newest-first for episodic shows. */
  episodes: PodcastEpisode[]
}
```

#### `PodcastCategory`

Structured representation of an iTunes category. Categories form a
shallow hierarchy — a top-level category may have an optional
sub-category (e.g. `Technology > Tech News`).

```typescript
interface PodcastCategory {
  /** Top-level iTunes category name, e.g. `Technology`. */
  text: string

  /** Optional iTunes sub-category nested under {@link text}. */
  subText?: string
}
```

#### `PodcastEnclosure`

Audio/video file attachment for an episode — emitted as `<enclosure>`.

```typescript
interface PodcastEnclosure {
  /** Direct URL to the audio/video file. */
  url: string

  /** Length in bytes. iTunes requires this; pass `0` only when truly unknown. */
  length: number

  /** MIME type, e.g. `audio/mpeg`, `audio/mp4`, `video/mp4`. */
  type: string
}
```

#### `PodcastEpisode`

A single podcast episode as input to {@link serializePodcastRss}.

```typescript
interface PodcastEpisode {
  /**
   * Stable opaque identifier emitted as `<guid isPermaLink="false">`.
   * Required and must be globally unique across the show's lifetime.
   */
  guid: string

  /** Episode title. Required. Will be XML-escaped on serialization. */
  title: string

  /** Optional canonical URL for the episode landing page. */
  link?: string

  /**
   * Plain-text summary surfaced as `<description>` and
   * `<itunes:summary>`. HTML-bearing content should go in
   * {@link contentEncoded}.
   */
  description?: string

  /**
   * Rich HTML body emitted inside `<content:encoded>` wrapped in
   * CDATA. Use for show notes with markup.
   */
  contentEncoded?: string

  /** Author / host / writer name for `<itunes:author>`. */
  author?: string

  /** Cover-art URL for `<itunes:image>`. */
  imageUrl?: string

  /** ISO 8601 publication timestamp. Emitted as RFC 822 `<pubDate>`. */
  publishedAt?: string

  /**
   * Episode duration in seconds. Serialized into `<itunes:duration>`
   * using `HH:MM:SS` when ≥ 1 hour, `MM:SS` otherwise. Pass a number,
   * not a pre-formatted string, so the serializer can canonicalize.
   */
  durationSeconds?: number

  /** Episode number for `<itunes:episode>`. Integer ≥ 1. */
  episodeNumber?: number

  /** Season number for `<itunes:season>`. Integer ≥ 1. */
  seasonNumber?: number

  /** Episode classification for `<itunes:episodeType>`. Defaults to `full`. */
  episodeType?: PodcastEpisodeType

  /** When `true`, emits `<itunes:explicit>true</itunes:explicit>`. */
  explicit?: boolean

  /** Audio/video file. iTunes requires an `<enclosure>` per episode. */
  enclosure: PodcastEnclosure

  /** Optional transcripts via Podcast Index `<podcast:transcript>`. */
  transcripts?: PodcastTranscript[]
}
```

#### `PodcastFeedRequest`

Minimal request shape consumed by the handler. Only the fields the
handler actually reads are included so adapters can synthesize them
without dragging in framework types.

```typescript
interface PodcastFeedRequest {
  /** Path parameter `id` from `GET /podcasts/:id/feed.xml`. */
  params: { id: string }
}
```

#### `PodcastFeedResponse`

Normalized response returned by the handler. Adapters translate this
into framework-specific calls (e.g. `res.status(...).type(...).send(...)`).

```typescript
interface PodcastFeedResponse {
  /** HTTP status code. `200` on success, `404` when the lookup fails. */
  status: number

  /** Response headers — always includes `Content-Type` for success. */
  headers: Record<string, string>

  /** Response body. Always a string (XML on success, plain text on 404). */
  body: string
}
```

#### `PodcastOwner`

Owner contact pair surfaced in the iTunes-namespace `<itunes:owner>`
block. iTunes/Apple Podcasts uses this to email the show owner.

```typescript
interface PodcastOwner {
  /** Owner display name. */
  name: string

  /** Owner email address. */
  email: string
}
```

#### `PodcastTranscript`

Transcript reference attached to an episode via the Podcast Index
namespace `<podcast:transcript>` element.

```typescript
interface PodcastTranscript {
  /** Direct URL to the transcript file. */
  url: string

  /** MIME type, e.g. `text/vtt`, `application/srt`, `text/html`. */
  type: string

  /** Optional BCP 47 language tag (e.g. `en`, `en-US`). */
  language?: string

  /**
   * Optional rel attribute. The Podcast Index spec uses `captions` to
   * indicate the transcript is intended as on-screen captions; omit
   * for full transcripts.
   */
  rel?: 'captions'
}
```

#### `SerializePodcastRssOptions`

Options controlling {@link serializePodcastRss} output.

```typescript
interface SerializePodcastRssOptions {
  /**
   * When `true` (default), declares the Podcast Index namespace
   * (`xmlns:podcast="https://podcastindex.org/namespace/1.0"`) and
   * emits `<podcast:*>` elements (e.g. `<podcast:transcript>`).
   *
   * Set to `false` to produce a strictly iTunes-only feed.
   */
  includePodcastNamespace?: boolean

  /**
   * When provided, used as the value for `<lastBuildDate>` instead of
   * the per-podcast value or `new Date()`. Useful for deterministic
   * tests and snapshot fixtures.
   */
  buildDate?: Date
}
```

### Types

#### `PodcastEpisodeType`

iTunes per-episode classification.

- `full` — a regular full-length episode (default).
- `trailer` — a short promo for the show or a season.
- `bonus` — supplemental content tied to an episode or season.

```typescript
type PodcastEpisodeType = 'full' | 'trailer' | 'bonus'
```

#### `PodcastLoader`

Loader signature — given a podcast id, return the {@link Podcast} or
`null` when not found. The handler treats `null` (or a thrown
`NotFoundError`-equivalent) as a 404.

```typescript
type PodcastLoader = (id: string) => Promise<Podcast | null> | Podcast | null
```

#### `PodcastType`

iTunes podcast type discriminator. Communicates whether a show is
episodic (latest-first, evergreen) or serial (chronological, e.g. an
audio drama where order matters).

```typescript
type PodcastType = 'episodic' | 'serial'
```

### Functions

#### `createPodcastFeedHandler(options)`

Create a framework-agnostic HTTP handler that responds to
`GET /podcasts/:id/feed.xml` with serialized RSS XML.

Behavior:
- On loader return-value `null` → `404` with `text/plain` body.
- On loader return-value {@link Podcast} → `200` with
  `application/rss+xml; charset=utf-8` body produced by
  {@link serializePodcastRss}.

Loader errors propagate — callers wrap in their own error middleware.

```typescript
function createPodcastFeedHandler(options: CreatePodcastFeedHandlerOptions): (req: PodcastFeedRequest) => Promise<PodcastFeedResponse>
```

- `options` — Loader + optional serializer options.

**Returns:** An async function `(req) => Promise<PodcastFeedResponse>`.

#### `escapeXml(value)`

XML-escape a string for safe inclusion in element text or attribute
values. Replaces `&`, `<`, `>`, `"`, and `'` with their named entity
references. Returns an empty string when input is `undefined` or
`null` so callers can chain freely.

```typescript
function escapeXml(value: string | null | undefined): string
```

- `value` — Untrusted text to escape.

**Returns:** Escaped XML-safe string.

#### `formatItunesDuration(seconds)`

Format a duration in seconds into the iTunes-preferred string form.
Apple Podcasts accepts both `MM:SS` and `HH:MM:SS`; we emit
`HH:MM:SS` when total length is ≥ 1 hour, `MM:SS` otherwise.

Negative or non-finite values throw — they indicate a programming
bug in the caller's domain mapping rather than malformed feed data.

```typescript
function formatItunesDuration(seconds: number): string
```

- `seconds` — Non-negative finite integer or float; fractional seconds are rounded down.

**Returns:** Zero-padded duration string.

#### `formatRfc822(input)`

Format an ISO 8601 timestamp (or a `Date`) as an RFC 822 string
suitable for `<pubDate>` and `<lastBuildDate>` in RSS 2.0. Uses GMT
for stable, locale-free output.

```typescript
function formatRfc822(input: string | Date): string
```

- `input` — Date instance or any string parseable by `Date`.

**Returns:** RFC 822 date string (e.g. `Mon, 01 May 2026 12:34:56 GMT`).

#### `serializePodcastRss(podcast, options)`

Serialize a {@link Podcast} into a complete RSS 2.0 XML document with
the iTunes namespace and (optionally) the Podcast Index 1.0
namespace. Output is a single string that begins with the XML
declaration and ends with `</rss>`.

The function is pure — no I/O, no side effects, no global state. All
untrusted text is XML-escaped (titles, authors, etc.) or CDATA-wrapped
(`<description>`, `<itunes:summary>`, `<content:encoded>`) so callers
can safely pass user-supplied content without introducing XSS into
downstream consumers that render the feed as HTML.

```typescript
function serializePodcastRss(podcast: Podcast, options?: SerializePodcastRssOptions): string
```

- `podcast` — Show metadata + episodes to serialize.
- `options` — Optional serializer flags. See {@link SerializePodcastRssOptions}.

**Returns:** A complete RSS 2.0 XML document as a string.

#### `wrapCdata(value)`

Wrap arbitrary text (including HTML markup) in a CDATA section. The
only sequence forbidden inside CDATA is the literal `]]>`, which we
neutralize by splitting it across two CDATA blocks. Idempotent:
`wrapCdata(wrapCdata(x))` produces the same XML semantics.

```typescript
function wrapCdata(value: string | null | undefined): string
```

- `value` — Text to wrap.

**Returns:** CDATA-wrapped string safe for embedding in XML element bodies.

## Injection Notes

The serializer is a **pure function** — no fetch, no DB, no global
state. Untrusted text is XML-escaped (titles, authors, attributes)
or CDATA-wrapped (`<description>`, `<itunes:summary>`,
`<content:encoded>`) so callers can safely pass user-supplied
content without introducing XSS into downstream consumers that
render the feed as HTML. The literal `]]>` sequence is split across
two CDATA blocks per the XML spec.

iTunes durations are formatted automatically — pass
`durationSeconds` as a number; the serializer emits `MM:SS` for
episodes shorter than one hour and `HH:MM:SS` otherwise.

For HTTP endpoints, see the second example: {@link createPodcastFeedHandler}
wires loader → serializer → `application/rss+xml` response behind a
framework-agnostic `(req) => Promise` handler whose response carries only
`status`, `headers`, and `body` — adapt it to Express, Fastify, Hono, or
raw Node http in a few lines. When the loader returns `null`, the handler
responds 404.

The Podcast Index namespace is enabled by default; pass
`{ includePodcastNamespace: false }` to {@link serializePodcastRss}
for an iTunes-only feed.
