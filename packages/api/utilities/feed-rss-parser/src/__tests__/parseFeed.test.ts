/**
 * Unit tests for `@molecule/api-feed-rss-parser`.
 *
 * Covers RSS 2.0 (blog), Atom 1.0 (GitHub releases), JSON Feed 1.1, RSS 1.0
 * (RDF), and an iTunes-extension podcast feed. Verifies normalization of
 * `feed` + `items[]` shapes, content sanitization, GUID/link/synthesized id
 * fallbacks, enclosure metadata (incl. iTunes duration), and format
 * detection edge cases.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { detectFeedFormat, parseFeed } from '../parseFeed.js'
import { sanitizeHtml } from '../sanitize.js'
import { FeedParseError } from '../types.js'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const fixture = (name: string) => readFileSync(join(FIXTURES, name), 'utf8')

describe('@molecule/api-feed-rss-parser', () => {
  describe('detectFeedFormat', () => {
    it('returns json-feed for application/json content type', () => {
      expect(detectFeedFormat('{}', 'application/json')).toBe('json-feed')
    })
    it('returns json-feed when body starts with {', () => {
      expect(detectFeedFormat('  { "version": "..." }', undefined)).toBe('json-feed')
    })
    it('returns rss-2.0 for an <rss> root', () => {
      expect(detectFeedFormat('<?xml version="1.0"?><rss version="2.0"></rss>', undefined)).toBe(
        'rss-2.0',
      )
    })
    it('returns atom-1.0 for a <feed> root', () => {
      expect(detectFeedFormat('<?xml version="1.0"?><feed></feed>', undefined)).toBe('atom-1.0')
    })
    it('returns rdf-1.0 for an <rdf:RDF> root', () => {
      expect(detectFeedFormat('<?xml version="1.0"?><rdf:RDF></rdf:RDF>', undefined)).toBe(
        'rdf-1.0',
      )
    })
    it('returns undefined for an unrecognized body', () => {
      expect(detectFeedFormat('<html><body>not a feed</body></html>', 'text/html')).toBeUndefined()
    })
  })

  describe('parseFeed — RSS 2.0 blog', () => {
    const body = fixture('blog-rss-2.0.xml')

    it('extracts feed-level metadata', () => {
      const { feed } = parseFeed(body)
      expect(feed.format).toBe('rss-2.0')
      expect(feed.title).toBe('Example Engineering Blog')
      expect(feed.description).toBe(
        'Posts about software engineering, architecture, and operations.',
      )
      expect(feed.link).toBe('https://example.com/blog/')
      expect(feed.feedUrl).toBe('https://example.com/blog/feed.xml')
      expect(feed.language).toBe('en-US')
      expect(feed.copyright).toBe('(c) 2026 Example Corp')
      expect(feed.author).toBe('blog@example.com (Editorial Team)')
      expect(feed.imageUrl).toBe('https://example.com/blog/logo.png')
      expect(feed.updatedAt).toBe('2026-04-28T14:00:00.000Z')
    })

    it('normalizes items in source order', () => {
      const { items } = parseFeed(body)
      expect(items).toHaveLength(2)
      expect(items[0]!.id).toBe('https://example.com/blog/posts/bond-system')
      expect(items[0]!.title).toBe('Designing the Bond System')
      expect(items[0]!.link).toBe('https://example.com/blog/posts/bond-system')
      expect(items[0]!.author).toBe('Pat Doe')
      expect(items[0]!.publishedAt).toBe('2026-04-26T09:30:00.000Z')
      expect(items[0]!.categories).toEqual(['architecture', 'typescript'])
      expect(items[0]!.summary).toContain('A short summary')

      expect(items[1]!.id).toBe('tag:example.com,2026:posts/versioning')
      expect(items[1]!.title).toBe('Versioning Strategy')
    })

    it('strips <script> from content:encoded by default', () => {
      const { items } = parseFeed(body)
      const html = items[0]!.content!
      expect(html).toContain('<p>The bond system')
      expect(html).not.toContain('<script')
      expect(html).not.toContain("alert('xss')")
    })

    it('keeps <script> when sanitizeHtml is false', () => {
      const { items } = parseFeed(body, { sanitizeHtml: false })
      expect(items[0]!.content!).toContain('<script>')
    })
  })

  describe('parseFeed — Atom 1.0 GitHub releases', () => {
    const body = fixture('github-releases-atom.xml')

    it('extracts feed-level metadata including alternate + self links', () => {
      const { feed } = parseFeed(body, { contentType: 'application/atom+xml' })
      expect(feed.format).toBe('atom-1.0')
      expect(feed.title).toBe('Release notes from example')
      expect(feed.link).toBe('https://github.com/example/example/releases')
      expect(feed.feedUrl).toBe('https://github.com/example/example/releases.atom')
      expect(feed.imageUrl).toBe('https://github.com/example.png')
      expect(feed.updatedAt).toBe('2026-04-28T15:00:00.000Z')
      expect(feed.description).toBe('Latest releases of the example project.')
    })

    it('normalizes entries with author + categories', () => {
      const { items } = parseFeed(body)
      expect(items).toHaveLength(2)
      expect(items[0]!.id).toBe('tag:github.com,2008:Repository/1234567/v2.0.0')
      expect(items[0]!.title).toBe('v2.0.0 — Major Release')
      expect(items[0]!.link).toBe('https://github.com/example/example/releases/tag/v2.0.0')
      expect(items[0]!.author).toBe('release-bot')
      expect(items[0]!.publishedAt).toBe('2026-04-28T14:55:00.000Z')
      expect(items[0]!.updatedAt).toBe('2026-04-28T15:00:00.000Z')
      expect(items[0]!.categories).toEqual(['release'])
    })

    it('sanitizes <script> from Atom <content>', () => {
      const { items } = parseFeed(body)
      expect(items[0]!.content!).toContain('<h2>Highlights</h2>')
      expect(items[0]!.content!).not.toContain('<script')
    })
  })

  describe('parseFeed — JSON Feed 1.1', () => {
    const body = fixture('jsonfeed-1.1.json')

    it('detects format from content-type', () => {
      const { feed } = parseFeed(body, { contentType: 'application/feed+json' })
      expect(feed.format).toBe('json-feed')
    })

    it('extracts feed metadata', () => {
      const { feed } = parseFeed(body)
      expect(feed.title).toBe('JSON Feed Example')
      expect(feed.link).toBe('https://example.org/')
      expect(feed.feedUrl).toBe('https://example.org/feed.json')
      expect(feed.description).toBe('Sample JSON Feed for tests.')
      expect(feed.language).toBe('en')
      expect(feed.imageUrl).toBe('https://example.org/icon.png')
      expect(feed.author).toBe('Editorial Team')
    })

    it('normalizes items with attachments and tags', () => {
      const { items } = parseFeed(body)
      expect(items).toHaveLength(2)

      const first = items[0]!
      expect(first.id).toBe('https://example.org/posts/2026-04-28')
      expect(first.title).toBe('JSON Feed at a Glance')
      expect(first.publishedAt).toBe('2026-04-28T13:00:00.000Z') // -05:00 → UTC
      expect(first.updatedAt).toBe('2026-04-28T14:00:00.000Z')
      expect(first.categories).toEqual(['formats', 'rss'])
      expect(first.author).toBe('Pat Doe')
      expect(first.enclosures).toHaveLength(1)
      expect(first.enclosures![0]!).toMatchObject({
        url: 'https://example.org/audio/episode.mp3',
        type: 'audio/mpeg',
        length: 1234567,
        durationSeconds: 1800,
        title: 'Episode audio',
      })
    })

    it('sanitizes content_html', () => {
      const { items } = parseFeed(body)
      expect(items[0]!.content!).toContain('<p>JSON Feed')
      expect(items[0]!.content!).not.toContain('<script')
    })

    it('falls back to content_text when content_html is missing', () => {
      const { items } = parseFeed(body)
      expect(items[1]!.id).toBe('post-2')
      expect(items[1]!.content).toBe('Just a quick note.')
    })

    it('throws FeedParseError on invalid JSON', () => {
      expect(() => parseFeed('{ not json }', { format: 'json-feed' })).toThrow(FeedParseError)
    })
  })

  describe('parseFeed — RSS 1.0 / RDF', () => {
    const body = fixture('rdf-1.0.xml')

    it('extracts feed metadata', () => {
      const { feed } = parseFeed(body)
      expect(feed.format).toBe('rdf-1.0')
      expect(feed.title).toBe('RDF Sample Feed')
      expect(feed.link).toBe('https://example.org/')
      expect(feed.language).toBe('en')
      expect(feed.copyright).toBe('(c) 2026 Example Org')
      expect(feed.updatedAt).toBe('2026-04-28T15:30:00.000Z')
    })

    it('normalizes items with dc:* fields', () => {
      const { items } = parseFeed(body)
      expect(items).toHaveLength(1)
      expect(items[0]!.title).toBe('Welcome')
      expect(items[0]!.author).toBe('Sam Lee')
      expect(items[0]!.publishedAt).toBe('2026-04-28T15:00:00.000Z')
      expect(items[0]!.categories).toEqual(['introduction'])
      expect(items[0]!.content).toBe('<p>Hi there!</p>')
    })
  })

  describe('parseFeed — iTunes podcast', () => {
    const body = fixture('podcast-itunes.xml')

    it('extracts iTunes channel-level metadata', () => {
      const { feed } = parseFeed(body)
      expect(feed.title).toBe('The Molecule Show')
      expect(feed.author).toBe('Pat Doe')
      expect(feed.imageUrl).toBe('https://podcast.example.com/cover.jpg')
    })

    it('attaches itunes:duration to enclosures (HH:MM:SS form)', () => {
      const { items } = parseFeed(body)
      const ep42 = items[0]!
      expect(ep42.title).toContain('Episode 42')
      expect(ep42.id).toBe('podcast-42')
      expect(ep42.author).toBe('Pat Doe')
      expect(ep42.enclosures).toHaveLength(1)
      expect(ep42.enclosures![0]!).toMatchObject({
        url: 'https://podcast.example.com/audio/ep-42.mp3',
        type: 'audio/mpeg',
        length: 60000000,
        durationSeconds: 6150, // 1h 42m 30s
      })
    })

    it('handles bare-integer itunes:duration (seconds form)', () => {
      const { items } = parseFeed(body)
      const ep41 = items[1]!
      expect(ep41.enclosures![0]!.durationSeconds).toBe(3600)
    })
  })

  describe('error handling', () => {
    it('throws on empty body', () => {
      expect(() => parseFeed('')).toThrow(FeedParseError)
      expect(() => parseFeed('   ')).toThrow(FeedParseError)
    })

    it('throws when format cannot be detected', () => {
      expect(() =>
        parseFeed('<html><body>nope</body></html>', { contentType: 'text/html' }),
      ).toThrow(FeedParseError)
    })

    it('synthesizes a stable id when guid + link are missing', () => {
      const xml = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>x</title>
            <item>
              <title>orphan</title>
              <pubDate>Mon, 28 Apr 2026 12:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`
      const a = parseFeed(xml).items[0]!
      const b = parseFeed(xml).items[0]!
      expect(a.id).toMatch(/^[0-9a-f]{40}$/)
      expect(a.id).toBe(b.id)
    })

    it('respects an explicit format override', () => {
      const xml = `<?xml version="1.0"?><feed><title>T</title></feed>`
      // Without override, this would be detected as Atom 1.0 — force it.
      const { feed } = parseFeed(xml, { format: 'atom-1.0' })
      expect(feed.format).toBe('atom-1.0')
    })
  })

  describe('sanitizeHtml helper', () => {
    it('strips <script> blocks and stray tags', () => {
      const dirty = `<p>ok</p><script>alert(1)</script><p>also ok</p><script src="x.js"></p>`
      const out = sanitizeHtml(dirty)!
      expect(out).not.toContain('<script')
      expect(out).toContain('<p>ok</p>')
    })

    it('strips inline event handlers', () => {
      const out = sanitizeHtml(`<a href="/" onclick="evil()">x</a>`)!
      expect(out).not.toContain('onclick')
      expect(out).toContain('<a href="/"')
    })

    it('rewrites javascript: URLs', () => {
      const out = sanitizeHtml(`<a href="javascript:alert(1)">x</a>`)!
      expect(out).not.toContain('javascript:')
    })

    it('returns undefined for nullish input', () => {
      expect(sanitizeHtml(undefined)).toBeUndefined()
      expect(sanitizeHtml(null)).toBeUndefined()
    })
  })
})
