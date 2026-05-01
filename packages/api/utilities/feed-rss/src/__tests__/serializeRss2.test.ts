/**
 * Unit tests for {@link serializeRss2}.
 *
 * Covers minimum-viable feed, full feature set with categories /
 * enclosures / authors / dates, podcast (iTunes) extensions, and
 * round-trip parsing via `@molecule/api-feed-rss-parser` to confirm
 * the output is valid and the data shape survives the trip.
 */

import { describe, expect, it } from 'vitest'

import { parseFeed } from '@molecule/api-feed-rss-parser'

import { serializeRss2 } from '../serializeRss2.js'
import type { Feed } from '../types.js'
import { FeedSerializeError } from '../types.js'

const baseFeed: Feed = {
  title: 'Example Engineering Blog',
  link: 'https://example.com/blog/',
  description: 'Posts about software engineering, architecture, and operations.',
  feedUrl: 'https://example.com/blog/feed.xml',
  language: 'en-US',
  copyright: '(c) 2026 Example Corp',
  authors: [{ name: 'Editorial Team', email: 'blog@example.com' }],
  imageUrl: 'https://example.com/blog/logo.png',
  updatedAt: '2026-04-28T14:00:00.000Z',
  items: [
    {
      id: 'https://example.com/blog/posts/bond-system',
      title: 'Designing the Bond System',
      link: 'https://example.com/blog/posts/bond-system',
      authors: [{ name: 'Pat Doe', email: 'pat@example.com' }],
      publishedAt: '2026-04-26T09:30:00.000Z',
      categories: ['architecture', 'typescript'],
      summary: 'A short summary of the bond system: <em>swappable</em> at runtime.',
      content: '<p>The bond system separates contracts from providers.</p>',
    },
    {
      id: 'tag:example.com,2026:posts/versioning',
      title: 'Versioning Strategy',
      link: 'https://example.com/blog/posts/versioning',
      authors: [{ name: 'Sam Lee', email: 'sam@example.com' }],
      publishedAt: '2026-04-23T12:00:00.000Z',
      categories: ['release'],
      summary: 'How we version Molecule packages.',
    },
  ],
}

describe('serializeRss2', () => {
  describe('shape validation', () => {
    it('throws when feed.title is empty', () => {
      expect(() => serializeRss2({ ...baseFeed, title: '' })).toThrow(FeedSerializeError)
    })
    it('throws when feed.link is empty', () => {
      expect(() => serializeRss2({ ...baseFeed, link: '' })).toThrow(FeedSerializeError)
    })
    it('throws when feed.description is empty', () => {
      expect(() => serializeRss2({ ...baseFeed, description: '' })).toThrow(FeedSerializeError)
    })
    it('throws when an item is missing id', () => {
      expect(() => serializeRss2({ ...baseFeed, items: [{ id: '', title: 'x' }] })).toThrow(
        FeedSerializeError,
      )
    })
  })

  describe('document shape', () => {
    it('emits the XML declaration and rss root', () => {
      const xml = serializeRss2(baseFeed)
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
      expect(xml).toContain('<rss version="2.0"')
      expect(xml).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"')
      expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"')
      expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"')
      expect(xml).toContain('</rss>')
    })

    it('includes required <title>, <link>, <description>', () => {
      const xml = serializeRss2(baseFeed)
      expect(xml).toContain('<title>Example Engineering Blog</title>')
      expect(xml).toContain('<link>https://example.com/blog/</link>')
      expect(xml).toContain(
        '<description>Posts about software engineering, architecture, and operations.</description>',
      )
    })

    it('emits <atom:link rel="self"> for feedUrl', () => {
      const xml = serializeRss2(baseFeed)
      expect(xml).toContain(
        '<atom:link href="https://example.com/blog/feed.xml" rel="self" type="application/rss+xml"/>',
      )
    })

    it('emits <pubDate> for items in RFC 822 form', () => {
      const xml = serializeRss2(baseFeed)
      expect(xml).toContain('<pubDate>Sun, 26 Apr 2026 09:30:00 GMT</pubDate>')
    })

    it('marks <guid isPermaLink="true"> for HTTP-URL ids', () => {
      const xml = serializeRss2(baseFeed)
      expect(xml).toContain(
        '<guid isPermaLink="true">https://example.com/blog/posts/bond-system</guid>',
      )
      expect(xml).toContain(
        '<guid isPermaLink="false">tag:example.com,2026:posts/versioning</guid>',
      )
    })
  })

  describe('XSS / escaping', () => {
    it('escapes &, <, >, ", \' in text nodes', () => {
      const xml = serializeRss2({
        ...baseFeed,
        title: `Tom & Jerry's <script>alert("x")</script>`,
        items: [],
      })
      expect(xml).toContain(
        '<title>Tom &amp; Jerry&apos;s &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</title>',
      )
      // Critical: no raw <script> tag should leak.
      expect(xml).not.toContain('<script>alert')
    })

    it('escapes attribute values (URL with quote injection)', () => {
      const xml = serializeRss2({
        ...baseFeed,
        feedUrl: `https://evil.example.com/" onload="alert(1)`,
        items: [],
      })
      expect(xml).not.toMatch(/href="[^"]*"\s*onload=/)
      expect(xml).toContain('&quot;')
    })

    it('CDATA-wraps content:encoded with HTML payload', () => {
      const xml = serializeRss2(baseFeed)
      expect(xml).toContain(
        '<content:encoded><![CDATA[<p>The bond system separates contracts from providers.</p>]]></content:encoded>',
      )
    })

    it('splits embedded ]]> in CDATA content', () => {
      const xml = serializeRss2({
        ...baseFeed,
        items: [
          {
            id: 'x',
            title: 't',
            content: 'before]]>after',
          },
        ],
      })
      // The original ]]> must not appear unsplit.
      expect(xml).toContain(']]]]><![CDATA[>')
    })

    it('rewrites javascript: URLs in <link> to about:blank', () => {
      const xml = serializeRss2({
        ...baseFeed,
        link: 'javascript:alert(1)',
        items: [],
      })
      expect(xml).not.toContain('javascript:')
      expect(xml).toContain('<link>about:blank</link>')
    })

    it('strips XML 1.0 illegal control characters from text nodes', () => {
      const xml = serializeRss2({
        ...baseFeed,
        title: 'a\x00b\x01c\x08d', // all illegal in XML 1.0
        items: [],
      })
      expect(xml).toContain('<title>abcd</title>')
    })
  })

  describe('round-trip via api-feed-rss-parser', () => {
    it('produces output the parser can consume', () => {
      const xml = serializeRss2(baseFeed)
      const { feed, items } = parseFeed(xml)
      expect(feed.format).toBe('rss-2.0')
      expect(feed.title).toBe('Example Engineering Blog')
      expect(feed.link).toBe('https://example.com/blog/')
      expect(feed.description).toContain('Posts about software')
      expect(feed.feedUrl).toBe('https://example.com/blog/feed.xml')
      expect(feed.language).toBe('en-US')
      expect(items).toHaveLength(2)
      expect(items[0]!.id).toBe('https://example.com/blog/posts/bond-system')
      expect(items[0]!.title).toBe('Designing the Bond System')
      expect(items[0]!.link).toBe('https://example.com/blog/posts/bond-system')
      expect(items[0]!.publishedAt).toBe('2026-04-26T09:30:00.000Z')
      expect(items[0]!.categories).toEqual(['architecture', 'typescript'])
      expect(items[0]!.content).toContain('<p>The bond system separates')
      expect(items[1]!.id).toBe('tag:example.com,2026:posts/versioning')
    })

    it('roundtrips dangerous markup safely', () => {
      const xml = serializeRss2({
        ...baseFeed,
        items: [
          {
            id: 'evil-1',
            title: 'pwn & </title><script>alert(1)</script>',
            content: '<p>real</p><script>alert(2)</script>',
            link: 'https://example.com/p/evil',
          },
        ],
      })
      const { items } = parseFeed(xml)
      // The injected </title> must not have closed our title element early.
      expect(items[0]!.title).toContain('<script>')
      // Content default-sanitization strips scripts in the parser.
      expect(items[0]!.content).not.toContain('<script')
    })
  })

  describe('podcast / iTunes namespace', () => {
    const podcastFeed: Feed = {
      title: 'The Molecule Show',
      link: 'https://podcast.example.com/',
      description: 'A podcast about composable architecture.',
      feedUrl: 'https://podcast.example.com/feed.xml',
      imageUrl: 'https://podcast.example.com/cover.jpg',
      authors: [{ name: 'Pat Doe', email: 'pat@example.com' }],
      updatedAt: '2026-04-28T15:00:00.000Z',
      itunes: {
        author: 'Pat Doe',
        explicit: false,
        owner: { name: 'Pat Doe', email: 'pat@example.com' },
        imageUrl: 'https://podcast.example.com/cover.jpg',
        type: 'episodic',
        categories: ['Technology'],
        summary: 'Long-form chat about composable systems.',
      },
      items: [
        {
          id: 'podcast-42',
          title: 'Episode 42 — The Bond System',
          link: 'https://podcast.example.com/ep/42',
          publishedAt: '2026-04-25T08:00:00.000Z',
          authors: [{ name: 'Pat Doe', email: 'pat@example.com' }],
          enclosures: [
            {
              url: 'https://podcast.example.com/audio/ep-42.mp3',
              type: 'audio/mpeg',
              length: 60000000,
            },
          ],
          itunes: {
            author: 'Pat Doe',
            durationSeconds: 6150, // 1h 42m 30s
            episode: 42,
            season: 1,
            explicit: false,
            imageUrl: 'https://podcast.example.com/ep-42-art.jpg',
          },
        },
      ],
    }

    it('declares xmlns:itunes when feed.itunes is present', () => {
      const xml = serializeRss2(podcastFeed)
      expect(xml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"')
    })

    it('emits channel-level itunes:owner / category / type', () => {
      const xml = serializeRss2(podcastFeed)
      expect(xml).toContain('<itunes:author>Pat Doe</itunes:author>')
      expect(xml).toContain('<itunes:type>episodic</itunes:type>')
      expect(xml).toContain('<itunes:category text="Technology"/>')
      expect(xml).toContain('<itunes:owner>')
      expect(xml).toContain('<itunes:name>Pat Doe</itunes:name>')
      expect(xml).toContain('<itunes:email>pat@example.com</itunes:email>')
    })

    it('emits per-item itunes:duration as HH:MM:SS', () => {
      const xml = serializeRss2(podcastFeed)
      expect(xml).toContain('<itunes:duration>01:42:30</itunes:duration>')
      expect(xml).toContain('<itunes:episode>42</itunes:episode>')
      expect(xml).toContain('<itunes:season>1</itunes:season>')
      expect(xml).toContain('<itunes:image href="https://podcast.example.com/ep-42-art.jpg"/>')
    })

    it('emits <enclosure> with the right attributes', () => {
      const xml = serializeRss2(podcastFeed)
      expect(xml).toContain(
        '<enclosure url="https://podcast.example.com/audio/ep-42.mp3" length="60000000" type="audio/mpeg"/>',
      )
    })

    it('podcast roundtrip via parser preserves duration', () => {
      const xml = serializeRss2(podcastFeed)
      const { items } = parseFeed(xml)
      expect(items[0]!.enclosures![0]!.durationSeconds).toBe(6150)
      expect(items[0]!.author).toBe('Pat Doe')
    })

    it('omits xmlns:itunes when feed.itunes is absent', () => {
      const xml = serializeRss2(baseFeed)
      expect(xml).not.toContain('xmlns:itunes')
      expect(xml).not.toContain('<itunes:')
    })
  })

  describe('options', () => {
    it('respects pretty: false', () => {
      const xml = serializeRss2(baseFeed, { pretty: false })
      expect(xml.includes('\n  <channel>')).toBe(false)
      expect(xml).toContain('<rss version="2.0"')
      expect(xml).toContain('</rss>')
    })

    it('respects custom xmlDeclaration', () => {
      const xml = serializeRss2(baseFeed, {
        xmlDeclaration: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      })
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true)
    })
  })
})
