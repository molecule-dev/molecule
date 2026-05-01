/**
 * Type definitions for podcast RSS feed serialization.
 *
 * Shapes are intentionally framework-agnostic — callers project their
 * domain entities (DB rows, ORM models, API DTOs) into these structures
 * and pass them to {@link serializePodcastRss} from `./serialize.js`.
 */

/**
 * iTunes podcast type discriminator. Communicates whether a show is
 * episodic (latest-first, evergreen) or serial (chronological, e.g. an
 * audio drama where order matters).
 */
export type PodcastType = 'episodic' | 'serial'

/**
 * iTunes per-episode classification.
 *
 * - `full` — a regular full-length episode (default).
 * - `trailer` — a short promo for the show or a season.
 * - `bonus` — supplemental content tied to an episode or season.
 */
export type PodcastEpisodeType = 'full' | 'trailer' | 'bonus'

/**
 * Structured representation of an iTunes category. Categories form a
 * shallow hierarchy — a top-level category may have an optional
 * sub-category (e.g. `Technology > Tech News`).
 */
export interface PodcastCategory {
  /** Top-level iTunes category name, e.g. `Technology`. */
  text: string

  /** Optional iTunes sub-category nested under {@link text}. */
  subText?: string
}

/**
 * Owner contact pair surfaced in the iTunes-namespace `<itunes:owner>`
 * block. iTunes/Apple Podcasts uses this to email the show owner.
 */
export interface PodcastOwner {
  /** Owner display name. */
  name: string

  /** Owner email address. */
  email: string
}

/**
 * Transcript reference attached to an episode via the Podcast Index
 * namespace `<podcast:transcript>` element.
 */
export interface PodcastTranscript {
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

/**
 * Audio/video file attachment for an episode — emitted as `<enclosure>`.
 */
export interface PodcastEnclosure {
  /** Direct URL to the audio/video file. */
  url: string

  /** Length in bytes. iTunes requires this; pass `0` only when truly unknown. */
  length: number

  /** MIME type, e.g. `audio/mpeg`, `audio/mp4`, `video/mp4`. */
  type: string
}

/**
 * A single podcast episode as input to {@link serializePodcastRss}.
 */
export interface PodcastEpisode {
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

/**
 * Top-level podcast / show metadata + episode collection consumed by
 * {@link serializePodcastRss}.
 */
export interface Podcast {
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

/**
 * Options controlling {@link serializePodcastRss} output.
 */
export interface SerializePodcastRssOptions {
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
