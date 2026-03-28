import { describe, expect, it } from 'vitest'

import type { SitemapProvider } from '@molecule/api-sitemap'

import { createProvider, provider } from '../provider.js'

describe('xml sitemap provider', () => {
  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(p.addUrl).toBeInstanceOf(Function)
      expect(p.generate).toBeInstanceOf(Function)
      expect(p.generateIndex).toBeInstanceOf(Function)
      expect(p.rss).toBeInstanceOf(Function)
      expect(p.atom).toBeInstanceOf(Function)
    })
  })

  describe('generate', () => {
    it('should generate a valid XML sitemap', async () => {
      const p = createProvider()
      p.addUrl({ loc: 'https://example.com/' })
      const xml = await p.generate()
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
      expect(xml).toContain('<loc>https://example.com/</loc>')
      expect(xml).toContain('</urlset>')
    })

    it('should include lastmod, changefreq, and priority', async () => {
      const p = createProvider()
      p.addUrl({
        loc: 'https://example.com/',
        lastmod: '2026-01-15T00:00:00Z',
        changefreq: 'daily',
        priority: 1.0,
      })
      const xml = await p.generate()
      expect(xml).toContain('<lastmod>2026-01-15T00:00:00Z</lastmod>')
      expect(xml).toContain('<changefreq>daily</changefreq>')
      expect(xml).toContain('<priority>1</priority>')
    })

    it('should handle Date objects for lastmod', async () => {
      const p = createProvider()
      const date = new Date('2026-03-28T12:00:00Z')
      p.addUrl({ loc: 'https://example.com/', lastmod: date })
      const xml = await p.generate()
      expect(xml).toContain('<lastmod>2026-03-28T12:00:00.000Z</lastmod>')
    })

    it('should include alternate language links', async () => {
      const p = createProvider()
      p.addUrl({
        loc: 'https://example.com/',
        alternates: [
          { hreflang: 'en', href: 'https://example.com/en/' },
          { hreflang: 'fr', href: 'https://example.com/fr/' },
        ],
      })
      const xml = await p.generate()
      expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
      expect(xml).toContain('hreflang="en"')
      expect(xml).toContain('hreflang="fr"')
    })

    it('should include image entries', async () => {
      const p = createProvider()
      p.addUrl({
        loc: 'https://example.com/',
        images: [{ loc: 'https://example.com/img.jpg', caption: 'A photo', title: 'Photo' }],
      })
      const xml = await p.generate()
      expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
      expect(xml).toContain('<image:loc>https://example.com/img.jpg</image:loc>')
      expect(xml).toContain('<image:caption>A photo</image:caption>')
      expect(xml).toContain('<image:title>Photo</image:title>')
    })

    it('should handle multiple URLs', async () => {
      const p = createProvider()
      p.addUrl({ loc: 'https://example.com/' })
      p.addUrl({ loc: 'https://example.com/about' })
      p.addUrl({ loc: 'https://example.com/contact' })
      const xml = await p.generate()
      expect(xml).toContain('https://example.com/')
      expect(xml).toContain('https://example.com/about')
      expect(xml).toContain('https://example.com/contact')
    })

    it('should reset URLs after generation', async () => {
      const p = createProvider()
      p.addUrl({ loc: 'https://example.com/' })
      await p.generate()
      const xml = await p.generate()
      expect(xml).not.toContain('https://example.com/')
    })

    it('should generate empty sitemap when no URLs added', async () => {
      const p = createProvider()
      const xml = await p.generate()
      expect(xml).toContain('<urlset')
      expect(xml).toContain('</urlset>')
    })

    it('should escape XML special characters', async () => {
      const p = createProvider()
      p.addUrl({ loc: 'https://example.com/?a=1&b=2' })
      const xml = await p.generate()
      expect(xml).toContain('https://example.com/?a=1&amp;b=2')
    })

    it('should include XSL stylesheet when configured', async () => {
      const p = createProvider({ xslUrl: '/sitemap.xsl' })
      p.addUrl({ loc: 'https://example.com/' })
      const xml = await p.generate()
      expect(xml).toContain('<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>')
    })

    it('should pretty-print when configured', async () => {
      const p = createProvider({ pretty: true })
      p.addUrl({ loc: 'https://example.com/' })
      const xml = await p.generate()
      expect(xml).toContain('\n')
      expect(xml).toContain('  <url>')
    })
  })

  describe('generateIndex', () => {
    it('should generate a valid sitemap index', async () => {
      const p = createProvider()
      const xml = await p.generateIndex([
        'https://example.com/sitemap1.xml',
        'https://example.com/sitemap2.xml',
      ])
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
      expect(xml).toContain('<loc>https://example.com/sitemap1.xml</loc>')
      expect(xml).toContain('<loc>https://example.com/sitemap2.xml</loc>')
      expect(xml).toContain('</sitemapindex>')
    })

    it('should handle empty sitemap list', async () => {
      const p = createProvider()
      const xml = await p.generateIndex([])
      expect(xml).toContain('<sitemapindex')
      expect(xml).toContain('</sitemapindex>')
    })
  })

  describe('rss', () => {
    it('should generate a valid RSS 2.0 feed', async () => {
      const p = createProvider()
      const xml = await p.rss({
        title: 'My Blog',
        description: 'Latest posts',
        link: 'https://example.com',
        items: [
          {
            title: 'First Post',
            description: 'Hello world',
            link: 'https://example.com/first-post',
          },
        ],
      })
      expect(xml).toContain('<rss version="2.0">')
      expect(xml).toContain('<title>My Blog</title>')
      expect(xml).toContain('<description>Latest posts</description>')
      expect(xml).toContain('<link>https://example.com</link>')
      expect(xml).toContain('<item>')
      expect(xml).toContain('<title>First Post</title>')
      expect(xml).toContain('<guid>https://example.com/first-post</guid>')
    })

    it('should include pubDate in RSS items', async () => {
      const p = createProvider()
      const xml = await p.rss({
        title: 'Test',
        description: 'Test',
        link: 'https://example.com',
        items: [
          {
            title: 'Post',
            description: 'Content',
            link: 'https://example.com/post',
            pubDate: new Date('2026-03-28T12:00:00Z'),
          },
        ],
      })
      expect(xml).toContain('<pubDate>')
      expect(xml).toContain('28 Mar 2026')
    })

    it('should include language when provided', async () => {
      const p = createProvider()
      const xml = await p.rss({
        title: 'Test',
        description: 'Test',
        link: 'https://example.com',
        language: 'en-us',
        items: [],
      })
      expect(xml).toContain('<language>en-us</language>')
    })

    it('should include item categories', async () => {
      const p = createProvider()
      const xml = await p.rss({
        title: 'Test',
        description: 'Test',
        link: 'https://example.com',
        items: [
          {
            title: 'Post',
            description: 'Content',
            link: 'https://example.com/post',
            categories: ['tech', 'news'],
          },
        ],
      })
      expect(xml).toContain('<category>tech</category>')
      expect(xml).toContain('<category>news</category>')
    })

    it('should include custom guid when provided', async () => {
      const p = createProvider()
      const xml = await p.rss({
        title: 'Test',
        description: 'Test',
        link: 'https://example.com',
        items: [
          {
            title: 'Post',
            description: 'Content',
            link: 'https://example.com/post',
            guid: 'custom-guid-123',
          },
        ],
      })
      expect(xml).toContain('<guid>custom-guid-123</guid>')
    })

    it('should include author when provided', async () => {
      const p = createProvider()
      const xml = await p.rss({
        title: 'Test',
        description: 'Test',
        link: 'https://example.com',
        items: [
          {
            title: 'Post',
            description: 'Content',
            link: 'https://example.com/post',
            author: 'author@example.com',
          },
        ],
      })
      expect(xml).toContain('<author>author@example.com</author>')
    })
  })

  describe('atom', () => {
    it('should generate a valid Atom feed', async () => {
      const p = createProvider()
      const xml = await p.atom({
        title: 'My Blog',
        link: 'https://example.com',
        id: 'https://example.com/feed',
        entries: [
          {
            title: 'First Post',
            link: 'https://example.com/first-post',
            summary: 'Hello world',
          },
        ],
      })
      expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">')
      expect(xml).toContain('<title>My Blog</title>')
      expect(xml).toContain('<link href="https://example.com"/>')
      expect(xml).toContain('<id>https://example.com/feed</id>')
      expect(xml).toContain('<entry>')
      expect(xml).toContain('<title>First Post</title>')
      expect(xml).toContain('<summary>Hello world</summary>')
    })

    it('should include subtitle when provided', async () => {
      const p = createProvider()
      const xml = await p.atom({
        title: 'Test',
        subtitle: 'A test feed',
        link: 'https://example.com',
        id: 'https://example.com/feed',
        entries: [],
      })
      expect(xml).toContain('<subtitle>A test feed</subtitle>')
    })

    it('should include feed-level author', async () => {
      const p = createProvider()
      const xml = await p.atom({
        title: 'Test',
        link: 'https://example.com',
        id: 'https://example.com/feed',
        author: { name: 'John Doe', email: 'john@example.com', uri: 'https://john.example.com' },
        entries: [],
      })
      expect(xml).toContain('<author>')
      expect(xml).toContain('<name>John Doe</name>')
      expect(xml).toContain('<email>john@example.com</email>')
      expect(xml).toContain('<uri>https://john.example.com</uri>')
    })

    it('should include entry-level author', async () => {
      const p = createProvider()
      const xml = await p.atom({
        title: 'Test',
        link: 'https://example.com',
        id: 'https://example.com/feed',
        entries: [
          {
            title: 'Post',
            link: 'https://example.com/post',
            author: { name: 'Jane', email: 'jane@example.com' },
          },
        ],
      })
      expect(xml).toContain('<name>Jane</name>')
      expect(xml).toContain('<email>jane@example.com</email>')
    })

    it('should include updated date', async () => {
      const p = createProvider()
      const xml = await p.atom({
        title: 'Test',
        link: 'https://example.com',
        id: 'https://example.com/feed',
        updated: '2026-03-28T12:00:00Z',
        entries: [],
      })
      expect(xml).toContain('<updated>2026-03-28T12:00:00Z</updated>')
    })

    it('should include entry categories', async () => {
      const p = createProvider()
      const xml = await p.atom({
        title: 'Test',
        link: 'https://example.com',
        id: 'https://example.com/feed',
        entries: [
          {
            title: 'Post',
            link: 'https://example.com/post',
            categories: ['tech', 'news'],
          },
        ],
      })
      expect(xml).toContain('term="tech"')
      expect(xml).toContain('term="news"')
    })

    it('should include content when provided', async () => {
      const p = createProvider()
      const xml = await p.atom({
        title: 'Test',
        link: 'https://example.com',
        id: 'https://example.com/feed',
        entries: [
          {
            title: 'Post',
            link: 'https://example.com/post',
            content: '<p>Full post content</p>',
          },
        ],
      })
      expect(xml).toContain('<content type="html">')
      expect(xml).toContain('&lt;p&gt;Full post content&lt;/p&gt;')
    })

    it('should default entry id to link', async () => {
      const p = createProvider()
      const xml = await p.atom({
        title: 'Test',
        link: 'https://example.com',
        id: 'https://example.com/feed',
        entries: [
          {
            title: 'Post',
            link: 'https://example.com/post',
          },
        ],
      })
      expect(xml).toContain('<id>https://example.com/post</id>')
    })
  })

  describe('default provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.addUrl).toBeInstanceOf(Function)
    })

    it('should conform to SitemapProvider interface', () => {
      const p: SitemapProvider = provider
      expect(p.addUrl).toBeInstanceOf(Function)
      expect(p.generate).toBeInstanceOf(Function)
      expect(p.generateIndex).toBeInstanceOf(Function)
      expect(p.rss).toBeInstanceOf(Function)
      expect(p.atom).toBeInstanceOf(Function)
    })
  })
})
