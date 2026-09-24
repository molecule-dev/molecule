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
 * import { addUrl, generate, rss, setProvider } from '@molecule/api-sitemap'
 * import { provider as xml } from '@molecule/api-sitemap-xml'
 *
 * // Startup: bond the provider once.
 * setProvider(xml)
 *
 * const posts = [
 *   { slug: 'hello', title: 'Hello', summary: 'First post', publishedAt: new Date('2026-01-05') },
 * ]
 *
 * // Per request/job: re-add EVERY url, then generate — generate() drains the list.
 * const renderSitemapXml = async (): Promise<string> => {
 *   addUrl({ loc: 'https://example.com/', changefreq: 'daily', priority: 1.0 })
 *   for (const post of posts) {
 *     addUrl({ loc: `https://example.com/blog/${post.slug}`, lastmod: post.publishedAt })
 *   }
 *   return generate()
 * }
 * const sitemapXml = await renderSitemapXml() // serve as application/xml at /sitemap.xml
 *
 * const feedXml = await rss({
 *   title: 'My Blog',
 *   description: 'Latest posts',
 *   link: 'https://example.com',
 *   items: posts.map((post) => ({
 *     title: post.title,
 *     description: post.summary,
 *     link: `https://example.com/blog/${post.slug}`,
 *     pubDate: post.publishedAt,
 *   })),
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
