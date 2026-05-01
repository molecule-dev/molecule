/**
 * RSS / Atom / JSON Feed **producer** for molecule.dev — pure-function
 * serializers that turn a single normalized {@link Feed} structure into
 * a valid RSS 2.0, Atom 1.0, or JSON Feed 1.1 document.
 *
 * Companion to `@molecule/api-feed-rss-parser` (the consumer side). Both
 * packages share a similar normalized shape, so apps can ingest external
 * feeds, store the items, and re-publish them through this package
 * without intermediate translation layers.
 *
 * Apps that use this:
 * - `blog` — emit `/feed.rss`, `/feed.atom`, `/feed.json` for posts.
 * - `news-aggregator` — re-publish curated cross-source feeds.
 * - `podcast` — RSS 2.0 with the iTunes namespace (set `feed.itunes`).
 *
 * @example One serializer per call
 * ```ts
 * import { serializeRss2, serializeAtom1, serializeJsonFeed } from '@molecule/api-feed-rss'
 *
 * const feed = {
 *   title: 'My Blog',
 *   link: 'https://example.com',
 *   description: 'Posts about software',
 *   items: [{ id: '1', title: 'Hello', link: 'https://example.com/p/1' }],
 * }
 *
 * const rss = serializeRss2(feed)
 * const atom = serializeAtom1(feed)
 * const json = serializeJsonFeed(feed)
 * ```
 *
 * @example HTTP handler with caching
 * ```ts
 * import { createFeedHandler } from '@molecule/api-feed-rss'
 *
 * const handle = createFeedHandler({
 *   loadFeed: async () => loadFromDb(),
 *   cacheTtlMs: 60_000,
 * })
 * // Wire `handle` into Express / Hono / Fastify — see createFeedHandler docs.
 * ```
 *
 * **Security**: every user-supplied field is escaped before serialization.
 * RSS / Atom XML use {@link escapeXml} for text nodes, {@link escapeAttr}
 * for attributes, {@link escapeUrl} for URL attributes (which neutralizes
 * `javascript:` URIs), and {@link wrapCdata} for HTML content (with
 * `]]>` splitting). JSON Feed relies on `JSON.stringify` for escaping.
 *
 * @module
 */

export * from './escape.js'
export * from './handler.js'
export * from './serializeAtom1.js'
export * from './serializeFeed.js'
export * from './serializeJsonFeed.js'
export * from './serializeRss2.js'
export * from './types.js'
export * from './utilities.js'
