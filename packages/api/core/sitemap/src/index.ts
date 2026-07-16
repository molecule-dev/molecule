/**
 * Provider-agnostic sitemap, RSS, and Atom feed generation interface for molecule.dev.
 *
 * Defines the `SitemapProvider` interface for generating XML sitemaps, sitemap
 * indexes, RSS 2.0 feeds, and Atom feeds. Bond packages provide concrete
 * implementations. Application code uses the convenience functions (`addUrl`,
 * `generate`, `generateIndex`, `rss`, `atom`) which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, addUrl, generate, rss } from '@molecule/api-sitemap'
 * import { provider as xml } from '@molecule/api-sitemap-xml'
 *
 * setProvider(xml)
 *
 * addUrl({ loc: 'https://example.com/', changefreq: 'daily', priority: 1.0 })
 * addUrl({ loc: 'https://example.com/about', changefreq: 'monthly' })
 * const sitemap = await generate()
 *
 * const feed = await rss({
 *   title: 'My Blog',
 *   description: 'Latest posts',
 *   link: 'https://example.com',
 *   items: [{ title: 'Hello', description: 'First post', link: 'https://example.com/hello' }],
 * })
 * ```
 *
 * @remarks
 * - **`generate()` DRAINS the accumulated URL list** — the provider resets its internal list
 *   after each call, so a second `generate()` returns an EMPTY sitemap. Treat
 *   addUrl→generate as one batch: rebuild the list (re-`addUrl` every current URL, e.g. from
 *   the database) inside the handler or job that serves/regenerates the sitemap. Never
 *   `addUrl` once at startup and `generate()` per request.
 * - `addUrl` accumulates GLOBAL provider state — build the full list and generate in ONE
 *   place; concurrent builders interleave into each other's output.
 * - `loc`/`link` values must be ABSOLUTE URLs (scheme + host). Serve the generated XML with
 *   an XML content type from a stable path (e.g. `/sitemap.xml`); past the sitemap-protocol
 *   cap (50,000 URLs per file) split into multiple sitemaps referenced via
 *   `generateIndex()`.
 * - RSS/Atom feeds are UNAUTHENTICATED surfaces — include only content the anonymous public
 *   may see.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
