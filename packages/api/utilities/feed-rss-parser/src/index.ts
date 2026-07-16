/**
 * Pure-function feed parser for molecule.dev — RSS 2.0, Atom 1.0, RSS 1.0
 * (RDF), and JSON Feed 1.0 / 1.1, normalized into a single `{ feed, items[] }`
 * shape. Used by `news-aggregator`, `blog`, and `podcast` apps for ingesting
 * external feeds and dedup'ing items by stable id.
 *
 * @example
 * ```ts
 * import { parseFeed } from '@molecule/api-feed-rss-parser'
 *
 * const res = await fetch('https://example.com/feed.xml')
 * const { feed, items } = parseFeed(await res.text(), {
 *   contentType: res.headers.get('content-type') ?? undefined,
 * })
 *
 * for (const item of items) {
 *   console.log(item.id, item.title, item.publishedAt)
 *   for (const enclosure of item.enclosures ?? []) {
 *     console.log(' ↳', enclosure.url, enclosure.type, enclosure.durationSeconds)
 *   }
 * }
 * ```
 *
 * @remarks
 * The parser is a pure function — it accepts the response body string plus
 * optional `contentType` / `format` hints and returns a normalized result.
 * No fetch, no state, no caching: callers fetch the document themselves
 * (native `fetch` or the bonded `@molecule/api-http` provider) and can
 * layer `@molecule/api-cache` on top for TTL caching.
 *
 * iTunes podcast namespace fields (`<itunes:duration>`, `<itunes:author>`,
 * `<itunes:image>`, `<itunes:category>`) are extracted into the normalized
 * shape — duration ends up on the matching `<enclosure>` as
 * `enclosure.durationSeconds`. Dublin Core (`dc:creator`, `dc:date`,
 * `dc:subject`) is also recognized for RSS 1.0 / RDF feeds.
 *
 * Item content fields are sanitized by default — `<script>` blocks, inline
 * event handlers, and `javascript:` URLs are stripped. Pass
 * `sanitizeHtml: false` to opt out (e.g. when sanitization happens further
 * down the pipeline).
 *
 * Item identifiers are derived in priority order: explicit GUID / Atom id /
 * JSON Feed id → item link URL → SHA-1 of `title + publishedAt`. The result
 * is always non-empty and stable across re-parses, so deduplication on
 * `item.id` is safe.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './parseFeed.js'
export * from './sanitize.js'
export * from './types.js'
