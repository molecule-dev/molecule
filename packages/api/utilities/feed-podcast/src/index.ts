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
 * For HTTP endpoints, see {@link createPodcastFeedHandler} — a
 * framework-agnostic factory that wires loader → serializer →
 * `application/rss+xml` response and is adapted by
 * `@molecule/api-middleware-*` to any specific server library.
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
