/**
 * Pure-function podcast RSS 2.0 feed serializer for molecule.dev.
 * Emits the iTunes namespace (`xmlns:itunes`) plus, by default, the
 * Podcast Index 1.0 namespace (`xmlns:podcast`) for transcripts and
 * other modern features.
 *
 * @example
 * ```ts
 * import { serializePodcastRss } from '@molecule/api-feed-podcast'
 *
 * const xml = serializePodcastRss({
 *   title: 'Synthase Show',
 *   link: 'https://example.com',
 *   description: 'Weekly chats about composable TypeScript.',
 *   author: 'Jane Smith',
 *   imageUrl: 'https://example.com/cover.jpg',
 *   categories: [{ text: 'Technology', subText: 'Tech News' }],
 *   owner: { name: 'Jane Smith', email: 'jane@example.com' },
 *   type: 'episodic',
 *   explicit: false,
 *   episodes: [
 *     {
 *       guid: 'ep-001',
 *       title: 'Pilot',
 *       description: 'Welcome to the show.',
 *       publishedAt: '2026-05-01T12:00:00Z',
 *       durationSeconds: 1830,
 *       seasonNumber: 1,
 *       episodeNumber: 1,
 *       episodeType: 'full',
 *       enclosure: {
 *         url: 'https://cdn.example.com/ep-001.mp3',
 *         length: 12345678,
 *         type: 'audio/mpeg',
 *       },
 *       transcripts: [
 *         { url: 'https://cdn.example.com/ep-001.vtt', type: 'text/vtt', language: 'en' },
 *       ],
 *     },
 *   ],
 * })
 * ```
 *
 * @example
 * ```ts
 * // HTTP endpoint — Express adapter
 * import { createPodcastFeedHandler, type Podcast } from '@molecule/api-feed-podcast'
 *
 * const loadPodcastById = async (id: string): Promise<Podcast | null> => null // your DB lookup
 * const app = { get(_path: string, _fn: (req: any, res: any) => void): void {} } // your Express app
 *
 * const handler = createPodcastFeedHandler({
 *   load: async (id) => loadPodcastById(id),
 * })
 *
 * app.get('/podcasts/:id/feed.xml', async (req, res) => {
 *   const result = await handler({ params: { id: req.params.id } })
 *   res.status(result.status)
 *   for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value)
 *   res.send(result.body)
 * })
 * ```
 *
 * @remarks
 * The serializer is a **pure function** — no fetch, no DB, no global
 * state. Untrusted text is XML-escaped (titles, authors, attributes)
 * or CDATA-wrapped (`<description>`, `<itunes:summary>`,
 * `<content:encoded>`) so callers can safely pass user-supplied
 * content without introducing XSS into downstream consumers that
 * render the feed as HTML. The literal `]]>` sequence is split across
 * two CDATA blocks per the XML spec.
 *
 * iTunes durations are formatted automatically — pass
 * `durationSeconds` as a number; the serializer emits `MM:SS` for
 * episodes shorter than one hour and `HH:MM:SS` otherwise.
 *
 * For HTTP endpoints, see the second example: {@link createPodcastFeedHandler}
 * wires loader → serializer → `application/rss+xml` response behind a
 * framework-agnostic `(req) => Promise` handler whose response carries only
 * `status`, `headers`, and `body` — adapt it to Express, Fastify, Hono, or
 * raw Node http in a few lines. When the loader returns `null`, the handler
 * responds 404.
 *
 * The Podcast Index namespace is enabled by default; pass
 * `{ includePodcastNamespace: false }` to {@link serializePodcastRss}
 * for an iTunes-only feed.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './handler.js'
export * from './serialize.js'
export * from './types.js'
export * from './utilities.js'
