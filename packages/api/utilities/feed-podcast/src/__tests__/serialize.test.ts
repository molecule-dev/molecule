import { describe, expect, it } from 'vitest'

import { createPodcastFeedHandler } from '../handler.js'
import { serializePodcastRss } from '../serialize.js'
import type { Podcast, PodcastEpisode } from '../types.js'
import { escapeXml, formatItunesDuration, formatRfc822, wrapCdata } from '../utilities.js'

const fixedBuildDate = new Date('2026-05-01T00:00:00Z')

const baseEpisode: PodcastEpisode = {
  guid: 'ep-001',
  title: 'Pilot Episode',
  description: 'Welcome to the show.',
  publishedAt: '2026-05-01T12:00:00Z',
  durationSeconds: 1830, // 30:30
  enclosure: {
    url: 'https://cdn.example.com/ep-001.mp3',
    length: 12345678,
    type: 'audio/mpeg',
  },
}

const basePodcast: Podcast = {
  title: 'Synthase Show',
  link: 'https://example.com',
  description: 'Weekly chats about composable TypeScript.',
  language: 'en-us',
  author: 'Jane Smith',
  imageUrl: 'https://example.com/cover.jpg',
  categories: [{ text: 'Technology' }],
  owner: { name: 'Jane Smith', email: 'jane@example.com' },
  type: 'episodic',
  explicit: false,
  feedUrl: 'https://example.com/feed.xml',
  episodes: [baseEpisode],
}

describe('escapeXml', () => {
  it('escapes the five reserved XML characters', () => {
    expect(escapeXml(`Tom & Jerry's <script>"alert"</script>`)).toBe(
      `Tom &amp; Jerry&apos;s &lt;script&gt;&quot;alert&quot;&lt;/script&gt;`,
    )
  })

  it('returns empty string for undefined / null', () => {
    expect(escapeXml(undefined)).toBe('')
    expect(escapeXml(null)).toBe('')
  })
})

describe('wrapCdata', () => {
  it('wraps plain text', () => {
    expect(wrapCdata('hello')).toBe('<![CDATA[hello]]>')
  })

  it('splits embedded ]]> sequences across two CDATA blocks', () => {
    const wrapped = wrapCdata('foo ]]> bar')
    expect(wrapped).toBe('<![CDATA[foo ]]]]><![CDATA[> bar]]>')
    // The combined text payload must reconstruct the original.
    expect(wrapped).not.toContain('foo ]]> bar')
    expect(wrapped.startsWith('<![CDATA[')).toBe(true)
    expect(wrapped.endsWith(']]>')).toBe(true)
  })

  it('handles undefined gracefully', () => {
    expect(wrapCdata(undefined)).toBe('<![CDATA[]]>')
  })
})

describe('formatItunesDuration', () => {
  it('formats sub-hour durations as MM:SS', () => {
    expect(formatItunesDuration(0)).toBe('00:00')
    expect(formatItunesDuration(59)).toBe('00:59')
    expect(formatItunesDuration(60)).toBe('01:00')
    expect(formatItunesDuration(1830)).toBe('30:30')
    expect(formatItunesDuration(3599)).toBe('59:59')
  })

  it('formats hour+ durations as HH:MM:SS', () => {
    expect(formatItunesDuration(3600)).toBe('01:00:00')
    expect(formatItunesDuration(3661)).toBe('01:01:01')
    expect(formatItunesDuration(36000)).toBe('10:00:00')
  })

  it('floors fractional seconds', () => {
    expect(formatItunesDuration(59.9)).toBe('00:59')
  })

  it('throws on negative or non-finite input', () => {
    expect(() => formatItunesDuration(-1)).toThrow(RangeError)
    expect(() => formatItunesDuration(NaN)).toThrow(RangeError)
    expect(() => formatItunesDuration(Infinity)).toThrow(RangeError)
  })
})

describe('formatRfc822', () => {
  it('formats a Date in GMT', () => {
    expect(formatRfc822(new Date('2026-05-01T12:34:56Z'))).toBe('Fri, 01 May 2026 12:34:56 GMT')
  })

  it('parses ISO 8601 strings', () => {
    expect(formatRfc822('2026-05-01T00:00:00Z')).toBe('Fri, 01 May 2026 00:00:00 GMT')
  })

  it('throws on invalid input', () => {
    expect(() => formatRfc822('not-a-date')).toThrow(RangeError)
  })
})

describe('serializePodcastRss', () => {
  it('emits a valid XML document with required iTunes channel elements', () => {
    const xml = serializePodcastRss(basePodcast, { buildDate: fixedBuildDate })
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"')
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"')
    expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"')
    expect(xml).toContain('<channel>')
    expect(xml).toContain('</channel>')
    expect(xml).toContain('</rss>')

    // iTunes-required channel elements
    expect(xml).toContain('<title>Synthase Show</title>')
    expect(xml).toContain('<link>https://example.com</link>')
    expect(xml).toContain('<itunes:author>Jane Smith</itunes:author>')
    expect(xml).toContain('<itunes:image href="https://example.com/cover.jpg"/>')
    expect(xml).toContain('<itunes:category text="Technology"/>')
    expect(xml).toContain('<itunes:explicit>false</itunes:explicit>')
    expect(xml).toContain('<itunes:type>episodic</itunes:type>')
    expect(xml).toContain('<itunes:owner>')
    expect(xml).toContain('<itunes:name>Jane Smith</itunes:name>')
    expect(xml).toContain('<itunes:email>jane@example.com</itunes:email>')
    expect(xml).toContain('</itunes:owner>')
    expect(xml).toContain(
      '<atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml"/>',
    )
    expect(xml).toContain('<lastBuildDate>Fri, 01 May 2026 00:00:00 GMT</lastBuildDate>')
  })

  it('emits required per-episode elements', () => {
    const xml = serializePodcastRss(basePodcast, { buildDate: fixedBuildDate })
    expect(xml).toContain('<item>')
    expect(xml).toContain('<guid isPermaLink="false">ep-001</guid>')
    expect(xml).toContain('<title>Pilot Episode</title>')
    expect(xml).toContain('<itunes:duration>30:30</itunes:duration>')
    expect(xml).toContain('<pubDate>Fri, 01 May 2026 12:00:00 GMT</pubDate>')
    expect(xml).toContain('<itunes:episodeType>full</itunes:episodeType>')
    expect(xml).toContain(
      '<enclosure url="https://cdn.example.com/ep-001.mp3" length="12345678" type="audio/mpeg"/>',
    )
    expect(xml).toContain('</item>')
  })

  it('XML-escapes attacker-supplied text and attributes', () => {
    const hostile: Podcast = {
      ...basePodcast,
      title: `Tom & "<script>alert('xss')</script>"`,
      author: `Jane & 'Co'`,
      imageUrl: 'https://example.com/cover.jpg?a=1&b=2',
      episodes: [
        {
          ...baseEpisode,
          title: '<script>',
          guid: 'ep&002',
          enclosure: {
            url: 'https://cdn.example.com/ep.mp3?a=1&b=2',
            length: 100,
            type: 'audio/mpeg',
          },
        },
      ],
    }
    const xml = serializePodcastRss(hostile, { buildDate: fixedBuildDate })
    expect(xml).not.toContain('<script>alert')
    expect(xml).toContain('&lt;script&gt;alert(&apos;xss&apos;)&lt;/script&gt;')
    expect(xml).toContain('Jane &amp; &apos;Co&apos;')
    expect(xml).toContain('<itunes:image href="https://example.com/cover.jpg?a=1&amp;b=2"/>')
    expect(xml).toContain('<guid isPermaLink="false">ep&amp;002</guid>')
    expect(xml).toContain('url="https://cdn.example.com/ep.mp3?a=1&amp;b=2"')
  })

  it('CDATA-wraps description / summary / content:encoded and neutralizes ]]>', () => {
    const xml = serializePodcastRss(
      {
        ...basePodcast,
        description: 'Outer ]]> closer',
        episodes: [
          {
            ...baseEpisode,
            description: 'Episode ]]> closer',
            contentEncoded: '<p>Show notes ]]> with HTML &amp; entities.</p>',
          },
        ],
      },
      { buildDate: fixedBuildDate },
    )
    // Channel-level description and summary both CDATA-wrapped
    expect(xml).toContain('<description><![CDATA[Outer ]]]]><![CDATA[> closer]]></description>')
    expect(xml).toContain(
      '<itunes:summary><![CDATA[Outer ]]]]><![CDATA[> closer]]></itunes:summary>',
    )
    // Episode-level
    expect(xml).toContain('<description><![CDATA[Episode ]]]]><![CDATA[> closer]]></description>')
    expect(xml).toContain(
      '<content:encoded><![CDATA[<p>Show notes ]]]]><![CDATA[> with HTML &amp; entities.</p>]]></content:encoded>',
    )
    // No raw ]]> outside of valid CDATA terminators
    expect(xml.split('<![CDATA[').length).toBeGreaterThan(1)
  })

  it('formats iTunes duration switching between MM:SS and HH:MM:SS', () => {
    const xml = serializePodcastRss(
      {
        ...basePodcast,
        episodes: [
          { ...baseEpisode, guid: 'a', durationSeconds: 90 },
          { ...baseEpisode, guid: 'b', durationSeconds: 3600 },
          { ...baseEpisode, guid: 'c', durationSeconds: 7325 },
        ],
      },
      { buildDate: fixedBuildDate },
    )
    expect(xml).toContain('<itunes:duration>01:30</itunes:duration>')
    expect(xml).toContain('<itunes:duration>01:00:00</itunes:duration>')
    expect(xml).toContain('<itunes:duration>02:02:05</itunes:duration>')
  })

  it('declares the Podcast Index namespace by default and emits podcast:transcript', () => {
    const xml = serializePodcastRss(
      {
        ...basePodcast,
        episodes: [
          {
            ...baseEpisode,
            transcripts: [
              { url: 'https://example.com/t.vtt', type: 'text/vtt', language: 'en' },
              { url: 'https://example.com/c.srt', type: 'application/srt', rel: 'captions' },
            ],
          },
        ],
      },
      { buildDate: fixedBuildDate },
    )
    expect(xml).toContain('xmlns:podcast="https://podcastindex.org/namespace/1.0"')
    expect(xml).toContain(
      '<podcast:transcript url="https://example.com/t.vtt" type="text/vtt" language="en"/>',
    )
    expect(xml).toContain(
      '<podcast:transcript url="https://example.com/c.srt" type="application/srt" rel="captions"/>',
    )
  })

  it('omits the Podcast Index namespace and transcripts when disabled', () => {
    const xml = serializePodcastRss(
      {
        ...basePodcast,
        episodes: [
          {
            ...baseEpisode,
            transcripts: [{ url: 'https://example.com/t.vtt', type: 'text/vtt' }],
          },
        ],
      },
      { buildDate: fixedBuildDate, includePodcastNamespace: false },
    )
    expect(xml).not.toContain('xmlns:podcast')
    expect(xml).not.toContain('<podcast:transcript')
  })

  it('emits multi-season ordering with episode + season numbers', () => {
    const xml = serializePodcastRss(
      {
        ...basePodcast,
        type: 'serial',
        episodes: [
          {
            ...baseEpisode,
            guid: 's1e1',
            seasonNumber: 1,
            episodeNumber: 1,
            episodeType: 'full',
          },
          {
            ...baseEpisode,
            guid: 's1e2',
            seasonNumber: 1,
            episodeNumber: 2,
            episodeType: 'bonus',
          },
          {
            ...baseEpisode,
            guid: 's2e1',
            seasonNumber: 2,
            episodeNumber: 1,
            episodeType: 'trailer',
          },
        ],
      },
      { buildDate: fixedBuildDate },
    )
    expect(xml).toContain('<itunes:type>serial</itunes:type>')
    // Season + episode tags rendered for each
    expect(xml.match(/<itunes:season>1<\/itunes:season>/g)?.length).toBe(2)
    expect(xml.match(/<itunes:season>2<\/itunes:season>/g)?.length).toBe(1)
    expect(xml).toContain('<itunes:episodeType>full</itunes:episodeType>')
    expect(xml).toContain('<itunes:episodeType>bonus</itunes:episodeType>')
    expect(xml).toContain('<itunes:episodeType>trailer</itunes:episodeType>')
    // Order preserved (s1e1 before s1e2 before s2e1)
    const idxS1E1 = xml.indexOf('s1e1')
    const idxS1E2 = xml.indexOf('s1e2')
    const idxS2E1 = xml.indexOf('s2e1')
    expect(idxS1E1).toBeLessThan(idxS1E2)
    expect(idxS1E2).toBeLessThan(idxS2E1)
  })

  it('renders nested itunes:category with sub-category', () => {
    const xml = serializePodcastRss(
      {
        ...basePodcast,
        categories: [{ text: 'Technology', subText: 'Tech News' }, { text: 'News' }],
      },
      { buildDate: fixedBuildDate },
    )
    expect(xml).toContain('<itunes:category text="Technology">')
    expect(xml).toContain('<itunes:category text="Tech News"/>')
    expect(xml).toContain('</itunes:category>')
    expect(xml).toContain('<itunes:category text="News"/>')
  })

  it('defaults episodeType to full when omitted', () => {
    const xml = serializePodcastRss(basePodcast, { buildDate: fixedBuildDate })
    expect(xml).toContain('<itunes:episodeType>full</itunes:episodeType>')
  })

  it('defaults language to en when omitted', () => {
    const { language: _drop, ...rest } = basePodcast
    void _drop
    const xml = serializePodcastRss(rest, { buildDate: fixedBuildDate })
    expect(xml).toContain('<language>en</language>')
  })

  it('uses provided lastBuildDate when no option override is supplied', () => {
    const xml = serializePodcastRss({
      ...basePodcast,
      lastBuildDate: '2025-12-31T23:59:59Z',
    })
    expect(xml).toContain('<lastBuildDate>Wed, 31 Dec 2025 23:59:59 GMT</lastBuildDate>')
  })

  it('rounds fractional / negative enclosure length and escapes invalid attributes', () => {
    const xml = serializePodcastRss(
      {
        ...basePodcast,
        episodes: [
          {
            ...baseEpisode,
            enclosure: {
              url: 'https://cdn.example.com/ep.mp3',
              length: -50,
              type: 'audio/mpeg',
            },
          },
        ],
      },
      { buildDate: fixedBuildDate },
    )
    expect(xml).toContain('length="0"')
  })
})

describe('createPodcastFeedHandler', () => {
  it('returns 200 with rss xml on hit', async () => {
    const handler = createPodcastFeedHandler({
      load: async (id) => (id === 'pod-1' ? basePodcast : null),
      serializerOptions: { buildDate: fixedBuildDate },
    })
    const res = await handler({ params: { id: 'pod-1' } })
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('application/rss+xml; charset=utf-8')
    expect(res.body.startsWith('<?xml')).toBe(true)
    expect(res.body).toContain('<title>Synthase Show</title>')
  })

  it('returns 404 with text body on miss', async () => {
    const handler = createPodcastFeedHandler({ load: async () => null })
    const res = await handler({ params: { id: 'missing' } })
    expect(res.status).toBe(404)
    expect(res.headers['Content-Type']).toBe('text/plain; charset=utf-8')
    expect(res.body).toBe('Podcast not found')
  })

  it('propagates loader errors', async () => {
    const handler = createPodcastFeedHandler({
      load: async () => {
        throw new Error('db down')
      },
    })
    await expect(handler({ params: { id: 'x' } })).rejects.toThrow('db down')
  })

  it('passes id through to loader unchanged', async () => {
    let received = ''
    const handler = createPodcastFeedHandler({
      load: async (id) => {
        received = id
        return null
      },
    })
    await handler({ params: { id: 'special-id-with-dashes' } })
    expect(received).toBe('special-id-with-dashes')
  })
})
