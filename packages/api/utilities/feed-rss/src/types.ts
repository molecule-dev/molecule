/**
 * Output format discriminator for {@link serializeFeed} and the
 * {@link createFeedHandler} HTTP handler.
 *
 * - `rss-2.0` — RSS 2.0 XML, served as `application/rss+xml`.
 * - `atom-1.0` — Atom 1.0 XML, served as `application/atom+xml`.
 * - `json-feed` — JSON Feed 1.1, served as `application/feed+json`.
 */
export type FeedOutputFormat = 'rss-2.0' | 'atom-1.0' | 'json-feed'

/**
 * Optional iTunes podcast metadata for an item.
 *
 * When supplied AND the channel-level {@link Feed.itunes} block is also
 * present, the RSS 2.0 serializer emits the iTunes podcast namespace
 * (`xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"`) and per-item
 * `<itunes:duration>`, `<itunes:author>`, `<itunes:explicit>`,
 * `<itunes:image>`, `<itunes:episode>`, `<itunes:season>`, `<itunes:summary>`
 * elements.
 */
export interface FeedItemItunes {
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

/**
 * Channel-level iTunes podcast metadata.
 *
 * Trigger condition: when present (even as `{}`), the RSS 2.0 serializer
 * declares the iTunes namespace and emits the configured `<itunes:*>`
 * channel elements.
 */
export interface FeedChannelItunes {
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

/**
 * Media enclosure (podcast audio, video, image, etc.).
 */
export interface FeedItemEnclosure {
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

/**
 * Author of a feed or item.
 */
export interface FeedAuthor {
  /** Display name. Required for Atom; optional everywhere else. */
  name: string

  /** Author email address. Optional. */
  email?: string

  /** Author profile / homepage URL. Optional. */
  url?: string

  /** Avatar URL (JSON Feed only). */
  avatarUrl?: string
}

/**
 * A single feed item / entry / post.
 */
export interface FeedItem {
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

/**
 * Feed-level metadata + items, format-agnostic input shape consumed by
 * every serializer.
 */
export interface Feed {
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

/**
 * Options controlling {@link serializeRss2}.
 */
export interface SerializeRss2Options {
  /** XML declaration. Defaults to `<?xml version="1.0" encoding="UTF-8"?>`. */
  xmlDeclaration?: string
  /** Pretty-print with 2-space indentation. Defaults to `true`. */
  pretty?: boolean
}

/**
 * Options controlling {@link serializeAtom1}.
 */
export interface SerializeAtom1Options {
  /** XML declaration. Defaults to `<?xml version="1.0" encoding="UTF-8"?>`. */
  xmlDeclaration?: string
  /** Pretty-print with 2-space indentation. Defaults to `true`. */
  pretty?: boolean
}

/**
 * Options controlling {@link serializeJsonFeed}.
 */
export interface SerializeJsonFeedOptions {
  /** Pretty-print with 2-space indentation. Defaults to `false`. */
  pretty?: boolean
}

/**
 * Error raised when the {@link Feed} input fails minimum-viability checks
 * (missing required `title` / `link` / `description`, missing item `id` or
 * `title`, etc.).
 */
export class FeedSerializeError extends Error {
  /** Output format hint at the point of failure, if known. */
  format?: FeedOutputFormat

  constructor(message: string, format?: FeedOutputFormat) {
    super(message)
    this.name = 'FeedSerializeError'
    this.format = format
  }
}
