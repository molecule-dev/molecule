/**
 * XML sitemap, RSS, and Atom feed provider for molecule.dev.
 *
 * Implements the `SitemapProvider` interface using zero-dependency XML string
 * generation. Produces valid XML sitemaps (with image and alternate language
 * support), sitemap indexes, RSS 2.0 feeds, and Atom feeds.
 *
 * @example
 * ```typescript
 * import { setProvider, addUrl, generate } from '@molecule/api-sitemap'
 * import { provider } from '@molecule/api-sitemap-xml'
 *
 * setProvider(provider)
 *
 * addUrl({ loc: 'https://example.com/', changefreq: 'daily', priority: 1.0 })
 * const xml = await generate()
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './xml.js'
