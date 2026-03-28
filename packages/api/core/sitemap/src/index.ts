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
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
