/**
 * Discriminator for the source feed format detected by {@link parseFeed}.
 *
 * - `rss-2.0` — RSS 2.0 (`<rss version="2.0"><channel>...`)
 * - `atom-1.0` — Atom 1.0 (`<feed xmlns="http://www.w3.org/2005/Atom">...`)
 * - `rdf-1.0` — RSS 1.0 / RDF (`<rdf:RDF ...><channel>...<item>`)
 * - `json-feed` — JSON Feed 1.0 / 1.1 (https://www.jsonfeed.org/version/1.1/)
 */
export type FeedFormat = 'rss-2.0' | 'atom-1.0' | 'rdf-1.0' | 'json-feed'

/**
 * A normalized media enclosure attached to a feed item (podcast audio,
 * video, image, etc.). Source: RSS `<enclosure>`, Atom `<link rel="enclosure">`,
 * JSON Feed `attachments[]`.
 */
export interface FeedEnclosure {
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

/**
 * Normalized feed-level metadata. The exact subset of fields populated
 * depends on what the source feed publishes; only `title` is guaranteed.
 */
export interface NormalizedFeed {
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

/**
 * Normalized feed item. The exact subset of fields populated depends on
 * what the source feed publishes; only `id` is guaranteed (synthesized from
 * `link` or content hash if no GUID is present).
 */
export interface NormalizedFeedItem {
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

/**
 * Parsed feed result returned by {@link parseFeed}.
 */
export interface ParsedFeed {
  /** Normalized feed-level metadata. */
  feed: NormalizedFeed

  /** Items in source order (NOT re-sorted by date). */
  items: NormalizedFeedItem[]
}

/**
 * Options controlling {@link parseFeed} behavior.
 */
export interface ParseFeedOptions {
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

/**
 * Error raised when {@link parseFeed} cannot determine the source format
 * or the body is malformed.
 */
export class FeedParseError extends Error {
  /** Detected or supplied format hint at the point of failure, if any. */
  format?: FeedFormat

  constructor(message: string, format?: FeedFormat) {
    super(message)
    this.name = 'FeedParseError'
    this.format = format
  }
}
