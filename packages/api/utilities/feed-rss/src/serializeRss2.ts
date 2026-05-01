/**
 * RSS 2.0 serializer — accepts a {@link Feed} structure and returns a
 * complete RSS 2.0 XML document string.
 *
 * @module
 */

import { escapeAttr, escapeUrl, escapeXml, wrapCdata } from './escape.js'
import type { Feed, FeedItem, SerializeRss2Options } from './types.js'
import { assertFeedShape, indent, looksLikeHttpUrl, toHhMmSs, toRfc822 } from './utilities.js'

const ATOM_NS = 'http://www.w3.org/2005/Atom'
const CONTENT_NS = 'http://purl.org/rss/1.0/modules/content/'
const ITUNES_NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd'

/**
 * Serialize an item to RSS 2.0 `<item>` XML.
 *
 * @param item - Feed item.
 * @param podcastMode - Whether channel-level iTunes metadata is present.
 * @param pretty - Whether to pretty-print children.
 * @returns `<item>...</item>` XML string.
 */
function renderItem(item: FeedItem, podcastMode: boolean, pretty: boolean): string {
  const lines: string[] = []
  lines.push(`<title>${escapeXml(item.title)}</title>`)

  if (item.link) {
    lines.push(`<link>${escapeUrl(item.link)}</link>`)
  }

  // <guid isPermaLink="true|false">id</guid>
  const isPermalink = looksLikeHttpUrl(item.id)
  lines.push(`<guid isPermaLink="${isPermalink ? 'true' : 'false'}">${escapeXml(item.id)}</guid>`)

  const pubDate = toRfc822(item.publishedAt)
  if (pubDate) {
    lines.push(`<pubDate>${escapeXml(pubDate)}</pubDate>`)
  }

  // RSS 2.0 <author> per spec is `email@example.com (Display Name)`.
  if (item.authors && item.authors.length > 0) {
    const author = item.authors[0]!
    if (author.email && author.name) {
      lines.push(`<author>${escapeXml(`${author.email} (${author.name})`)}</author>`)
    } else if (author.email) {
      lines.push(`<author>${escapeXml(author.email)}</author>`)
    } else if (author.name) {
      // No email — fall back to dc:creator below; RSS spec disallows
      // <author> without an email but consumers tolerate it. We emit
      // dc:creator instead to stay spec-clean.
      lines.push(`<dc:creator>${escapeXml(author.name)}</dc:creator>`)
    }
  }

  if (item.categories) {
    for (const cat of item.categories) {
      lines.push(`<category>${escapeXml(cat)}</category>`)
    }
  }

  if (item.summary !== undefined) {
    // Summary is HTML-or-text; CDATA-wrap to preserve markup safely.
    lines.push(`<description>${wrapCdata(item.summary)}</description>`)
  }

  if (item.content !== undefined) {
    if (item.contentIsHtml === false) {
      // Plain text — escape and put in description-equivalent slot.
      // RSS 2.0 has no `<content>` element; use <content:encoded> with text
      // wrapped in CDATA so reader UIs treat it as preformatted.
      lines.push(`<content:encoded>${wrapCdata(item.content)}</content:encoded>`)
    } else {
      lines.push(`<content:encoded>${wrapCdata(item.content)}</content:encoded>`)
    }
  }

  if (item.enclosures) {
    for (const enc of item.enclosures) {
      const url = escapeAttr(enc.url)
      const type = escapeAttr(enc.type ?? 'application/octet-stream')
      const length = Number.isFinite(enc.length) ? String(enc.length) : '0'
      lines.push(`<enclosure url="${url}" length="${escapeAttr(length)}" type="${type}"/>`)
    }
  }

  if (podcastMode && item.itunes) {
    const it = item.itunes
    if (it.author) lines.push(`<itunes:author>${escapeXml(it.author)}</itunes:author>`)
    const dur = toHhMmSs(it.durationSeconds)
    if (dur) lines.push(`<itunes:duration>${escapeXml(dur)}</itunes:duration>`)
    if (it.explicit !== undefined) {
      lines.push(`<itunes:explicit>${it.explicit ? 'true' : 'false'}</itunes:explicit>`)
    }
    if (it.imageUrl) {
      lines.push(`<itunes:image href="${escapeAttr(it.imageUrl)}"/>`)
    }
    if (it.episode !== undefined && Number.isFinite(it.episode)) {
      lines.push(`<itunes:episode>${escapeXml(String(it.episode))}</itunes:episode>`)
    }
    if (it.season !== undefined && Number.isFinite(it.season)) {
      lines.push(`<itunes:season>${escapeXml(String(it.season))}</itunes:season>`)
    }
    if (it.summary) {
      lines.push(`<itunes:summary>${wrapCdata(it.summary)}</itunes:summary>`)
    }
  }

  const inner = lines.join(pretty ? '\n' : '')
  if (!pretty) return `<item>${inner}</item>`
  return `<item>\n${indent(inner, 2)}\n</item>`
}

/**
 * Serialize a {@link Feed} to a complete RSS 2.0 XML document.
 *
 * The output is valid RSS 2.0 — declares the `dc`, `content`, and `atom`
 * namespaces always, plus `itunes` when {@link Feed.itunes} is present.
 *
 * **All user-supplied content is escaped** — text fields run through
 * {@link escapeXml}, attribute values through {@link escapeAttr}, URLs
 * through {@link escapeUrl} (which neutralizes `javascript:` URIs), and
 * HTML-bearing fields (`description`, `content:encoded`,
 * `itunes:summary`) are CDATA-wrapped via {@link wrapCdata} with
 * `]]>` splitting.
 *
 * @example
 * ```ts
 * import { serializeRss2 } from '@molecule/api-feed-rss'
 *
 * const xml = serializeRss2({
 *   title: 'My Blog',
 *   link: 'https://example.com',
 *   description: 'Posts about software',
 *   feedUrl: 'https://example.com/feed.xml',
 *   items: [
 *     {
 *       id: 'https://example.com/posts/hello',
 *       title: 'Hello, world!',
 *       link: 'https://example.com/posts/hello',
 *       publishedAt: new Date(),
 *       content: '<p>First post.</p>',
 *     },
 *   ],
 * })
 * ```
 *
 * @param feed - The feed structure to serialize.
 * @param options - See {@link SerializeRss2Options}.
 * @returns Complete RSS 2.0 XML document string.
 * @throws {@link FeedSerializeError} when required fields are missing.
 */
export function serializeRss2(feed: Feed, options: SerializeRss2Options = {}): string {
  assertFeedShape(feed, 'rss-2.0')
  const pretty = options.pretty !== false
  const xmlDecl = options.xmlDeclaration ?? '<?xml version="1.0" encoding="UTF-8"?>'
  const podcastMode = feed.itunes !== undefined

  const nsAttrs = [
    `version="2.0"`,
    `xmlns:dc="http://purl.org/dc/elements/1.1/"`,
    `xmlns:content="${CONTENT_NS}"`,
    `xmlns:atom="${ATOM_NS}"`,
  ]
  if (podcastMode) nsAttrs.push(`xmlns:itunes="${ITUNES_NS}"`)

  const channel: string[] = []
  channel.push(`<title>${escapeXml(feed.title)}</title>`)
  channel.push(`<link>${escapeUrl(feed.link)}</link>`)
  channel.push(`<description>${escapeXml(feed.description)}</description>`)

  if (feed.language) channel.push(`<language>${escapeXml(feed.language)}</language>`)
  if (feed.copyright) channel.push(`<copyright>${escapeXml(feed.copyright)}</copyright>`)
  if (feed.authors && feed.authors.length > 0) {
    const a = feed.authors[0]!
    if (a.email && a.name) {
      channel.push(`<managingEditor>${escapeXml(`${a.email} (${a.name})`)}</managingEditor>`)
    } else if (a.email) {
      channel.push(`<managingEditor>${escapeXml(a.email)}</managingEditor>`)
    }
  }

  const lastBuild = toRfc822(feed.updatedAt)
  if (lastBuild) channel.push(`<lastBuildDate>${escapeXml(lastBuild)}</lastBuildDate>`)

  if (feed.feedUrl) {
    channel.push(
      `<atom:link href="${escapeAttr(feed.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    )
  }

  if (feed.imageUrl) {
    if (pretty) {
      channel.push(
        `<image>\n  <url>${escapeUrl(feed.imageUrl)}</url>\n  <title>${escapeXml(feed.title)}</title>\n  <link>${escapeUrl(feed.link)}</link>\n</image>`,
      )
    } else {
      channel.push(
        `<image><url>${escapeUrl(feed.imageUrl)}</url><title>${escapeXml(feed.title)}</title><link>${escapeUrl(feed.link)}</link></image>`,
      )
    }
  }

  if (feed.categories) {
    for (const cat of feed.categories) {
      channel.push(`<category>${escapeXml(cat)}</category>`)
    }
  }

  if (podcastMode && feed.itunes) {
    const it = feed.itunes
    if (it.author) channel.push(`<itunes:author>${escapeXml(it.author)}</itunes:author>`)
    if (it.summary) channel.push(`<itunes:summary>${wrapCdata(it.summary)}</itunes:summary>`)
    if (it.explicit !== undefined) {
      channel.push(`<itunes:explicit>${it.explicit ? 'true' : 'false'}</itunes:explicit>`)
    }
    if (it.imageUrl) {
      channel.push(`<itunes:image href="${escapeAttr(it.imageUrl)}"/>`)
    }
    if (it.type) {
      channel.push(`<itunes:type>${escapeXml(it.type)}</itunes:type>`)
    }
    if (it.owner) {
      const ownerInner = `<itunes:name>${escapeXml(it.owner.name)}</itunes:name><itunes:email>${escapeXml(it.owner.email)}</itunes:email>`
      if (pretty) {
        channel.push(
          `<itunes:owner>\n  <itunes:name>${escapeXml(it.owner.name)}</itunes:name>\n  <itunes:email>${escapeXml(it.owner.email)}</itunes:email>\n</itunes:owner>`,
        )
      } else {
        channel.push(`<itunes:owner>${ownerInner}</itunes:owner>`)
      }
    }
    if (it.categories) {
      for (const cat of it.categories) {
        channel.push(`<itunes:category text="${escapeAttr(cat)}"/>`)
      }
    }
  }

  for (const item of feed.items) {
    channel.push(renderItem(item, podcastMode, pretty))
  }

  if (!pretty) {
    return `${xmlDecl}<rss ${nsAttrs.join(' ')}><channel>${channel.join('')}</channel></rss>`
  }

  const channelBody = channel.join('\n')
  return `${xmlDecl}\n<rss ${nsAttrs.join(' ')}>\n  <channel>\n${indent(channelBody, 4)}\n  </channel>\n</rss>`
}
