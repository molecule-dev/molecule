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
 * @example HTTP handler with caching — Express adapter
 * ```ts
 * import { createFeedHandler, type Feed } from '@molecule/api-feed-rss'
 *
 * const loadFromDb = async (): Promise<Feed> => ({ title: 'My Feed', link: 'https://example.com', description: 'Latest posts', items: [] }) // your DB lookup
 * const app = { get(_path: string, _fn: (req: any, res: any) => void): void {} } // your Express app
 *
 * const handle = createFeedHandler({
 *   loadFeed: async () => loadFromDb(),
 *   cacheTtlMs: 60_000,
 * })
 *
 * // Serves GET /feed.rss, /feed.atom, /feed.json (keyed by extension).
 * // The handler returns { status, headers, body } — map those onto any
 * // framework's response (Fastify/Hono/raw http look the same).
 * app.get('/feed.:ext', async (req, res) => {
 *   const result = await handle({
 *     extension: req.params.ext,
 *     ifNoneMatch: req.get('If-None-Match'),
 *   })
 *   res.status(result.status).set(result.headers).send(result.body)
 * })
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

export * from './browser-guard.js'
export * from './escape.js'
export * from './handler.js'
export * from './serializeAtom1.js'
export * from './serializeFeed.js'
export * from './serializeJsonFeed.js'
export * from './serializeRss2.js'
export * from './types.js'
export * from './utilities.js'
