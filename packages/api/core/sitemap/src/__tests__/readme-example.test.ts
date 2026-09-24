/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real XML bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider as xml } from '@molecule/api-sitemap-xml'

import { addUrl, generate, rss, setProvider } from '../index.js'

describe('README @example', () => {
  it('rebuilds the sitemap per call and renders an RSS feed', async () => {
    setProvider(xml)

    const posts = [
      { slug: 'hello', title: 'Hello', summary: 'First post', publishedAt: new Date('2026-01-05') },
    ]

    const renderSitemapXml = async (): Promise<string> => {
      addUrl({ loc: 'https://example.com/', changefreq: 'daily', priority: 1.0 })
      for (const post of posts) {
        addUrl({ loc: `https://example.com/blog/${post.slug}`, lastmod: post.publishedAt })
      }
      return generate()
    }
    const sitemapXml = await renderSitemapXml()
    expect(sitemapXml).toContain('<loc>https://example.com/</loc>')
    expect(sitemapXml).toContain('<loc>https://example.com/blog/hello</loc>')

    // Rebuilding inside the function yields the same full sitemap again (the list was drained).
    expect(await renderSitemapXml()).toBe(sitemapXml)
    expect(await generate()).not.toContain('<loc>')

    const feedXml = await rss({
      title: 'My Blog',
      description: 'Latest posts',
      link: 'https://example.com',
      items: posts.map((post) => ({
        title: post.title,
        description: post.summary,
        link: `https://example.com/blog/${post.slug}`,
        pubDate: post.publishedAt,
      })),
    })
    expect(feedXml).toContain('<rss')
    expect(feedXml).toContain('<title>Hello</title>')
    expect(feedXml).toContain('<link>https://example.com/blog/hello</link>')
  })
})
