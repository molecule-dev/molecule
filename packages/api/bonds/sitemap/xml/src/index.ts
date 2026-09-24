/**
 * XML sitemap, RSS, and Atom feed provider for molecule.dev.
 *
 * Implements the `SitemapProvider` interface using zero-dependency XML string
 * generation. Produces valid XML sitemaps (with image and alternate language
 * support), sitemap indexes, RSS 2.0 feeds, and Atom feeds.
 *
 * @example
 * ```typescript
 * import { addUrl, generate, setProvider } from '@molecule/api-sitemap'
 * import { createProvider } from '@molecule/api-sitemap-xml'
 *
 * // Startup: bond once.
 * setProvider(createProvider({ pretty: true }))
 *
 * // Per request (e.g. GET /sitemap.xml): add every URL, then generate() — which also CLEARS them.
 * const siteUrl = 'https://www.example.com'
 * const posts = [
 *   { slug: 'hello-world', updatedAt: new Date('2026-09-01T12:00:00Z') },
 *   { slug: 'release-notes', updatedAt: new Date('2026-09-20T08:30:00Z') },
 * ]
 *
 * addUrl({ loc: `${siteUrl}/`, changefreq: 'daily', priority: 1.0 })
 * for (const post of posts) {
 *   addUrl({ loc: `${siteUrl}/blog/${post.slug}`, lastmod: post.updatedAt, changefreq: 'weekly' })
 * }
 *
 * const xml = await generate()
 * // '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">…'
 * // Serve it with Content-Type: application/xml
 * ```
 *
 * @remarks
 * - **`generate()` empties the URL list** after rendering. Add the URLs on every request (or
 *   every rebuild) right before calling it — URLs added at startup appear in the FIRST
 *   sitemap only, and a second `generate()` returns an empty `<urlset>`.
 * - **The list is shared by the whole process** (one bonded provider). Two concurrent
 *   requests that interleave `addUrl()` calls end up in one sitemap; build synchronously
 *   between the first `addUrl()` and `generate()` as above (no `await` in between).
 * - **It only renders strings** — it does not serve a route, write files, split at the 50,000-URL
 *   sitemap limit, or ping search engines. For large sites, split yourself and list the parts
 *   with `generateIndex([...absoluteSitemapUrls])`.
 * - `loc` must be an ABSOLUTE URL; nothing is resolved against a base. `lastmod` accepts a
 *   `Date` (rendered as full ISO 8601) or a string (used verbatim). Text is XML-escaped.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
export * from './xml.js'
