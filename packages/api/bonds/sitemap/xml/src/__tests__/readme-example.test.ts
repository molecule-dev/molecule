/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — no mocks, the provider is pure.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { addUrl, generate, setProvider } from '@molecule/api-sitemap'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('renders every added URL, then clears the list', async () => {
    setProvider(createProvider({ pretty: true }))

    const siteUrl = 'https://www.example.com'
    const posts = [
      { slug: 'hello-world', updatedAt: new Date('2026-09-01T12:00:00Z') },
      { slug: 'release-notes', updatedAt: new Date('2026-09-20T08:30:00Z') },
    ]

    addUrl({ loc: `${siteUrl}/`, changefreq: 'daily', priority: 1.0 })
    for (const post of posts) {
      addUrl({ loc: `${siteUrl}/blog/${post.slug}`, lastmod: post.updatedAt, changefreq: 'weekly' })
    }

    const xml = await generate()

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset ')).toBe(true)
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(xml).toContain('<loc>https://www.example.com/</loc>')
    expect(xml).toContain('<priority>1</priority>')
    expect(xml).toContain('<loc>https://www.example.com/blog/hello-world</loc>')
    expect(xml).toContain('<lastmod>2026-09-20T08:30:00.000Z</lastmod>')
    expect(xml.match(/<url>/g)).toHaveLength(3)

    // generate() cleared the list — the next sitemap starts empty.
    const again = await generate()
    expect(again).not.toContain('<url>')
  })
})
