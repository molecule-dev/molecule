import { sanitizeHtml } from './sanitize.js'
import type { FeedEnclosure, NormalizedFeed, NormalizedFeedItem, ParsedFeed } from './types.js'
import {
  attrOf,
  parseItunesDuration,
  synthesizeItemId,
  textOf,
  toArray,
  toIsoDate,
} from './utilities.js'

interface ParseRssArgs {
  /** The fast-xml-parser document — already known to contain an `<rss>` root. */
  doc: Record<string, unknown>
  /** Whether to run {@link sanitizeHtml} on `summary` / `content` fields. */
  sanitize: boolean
}

/**
 * Parse an RSS 2.0 document into the normalized {@link ParsedFeed} shape.
 *
 * @param args - Parsed XML document plus options.
 * @param args.doc
 * @param args.sanitize
 * @returns Normalized feed + items.
 */
export function parseRss({ doc, sanitize }: ParseRssArgs): ParsedFeed {
  const rss = (doc['rss'] ?? {}) as Record<string, unknown>
  const channel = (rss['channel'] ?? {}) as Record<string, unknown>

  const feed: NormalizedFeed = {
    title: textOf(channel['title']) ?? '',
    description: textOf(channel['description']),
    link: extractRssLink(channel),
    language: textOf(channel['language']),
    updatedAt: toIsoDate(textOf(channel['lastBuildDate'])) ?? toIsoDate(textOf(channel['pubDate'])),
    author: textOf(channel['managingEditor']) ?? textOf(channel['itunes:author']),
    copyright: textOf(channel['copyright']),
    imageUrl: extractRssImage(channel),
    feedUrl: attrOf((channel['atom:link'] ?? channel['atom10:link']) as unknown, 'href'),
    format: 'rss-2.0',
  }

  const rawItems = toArray<Record<string, unknown>>(
    channel['item'] as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )

  const items: NormalizedFeedItem[] = rawItems.map((raw) => buildRssItem(raw, sanitize))

  return { feed, items }
}

/**
 *
 * @param channel
 */
function extractRssLink(channel: Record<string, unknown>): string | undefined {
  const link = channel['link']
  if (Array.isArray(link)) {
    for (const candidate of link) {
      const text = textOf(candidate)
      if (text) return text
    }
    return undefined
  }
  if (typeof link === 'string') return link.trim() || undefined
  return textOf(link)
}

/**
 *
 * @param channel
 */
function extractRssImage(channel: Record<string, unknown>): string | undefined {
  const image = channel['image']
  if (image && typeof image === 'object') {
    const url = textOf((image as Record<string, unknown>)['url'])
    if (url) return url
  }
  const itunesImage = channel['itunes:image']
  if (itunesImage) {
    const href = attrOf(itunesImage, 'href')
    if (href) return href
  }
  return undefined
}

/**
 *
 * @param raw
 * @param sanitize
 */
function buildRssItem(raw: Record<string, unknown>, sanitize: boolean): NormalizedFeedItem {
  const title = textOf(raw['title']) ?? ''
  const link = extractRssLink(raw)
  const guid = textOf(raw['guid'])
  const publishedAt = toIsoDate(textOf(raw['pubDate']))
  const updatedAt = toIsoDate(
    textOf(raw['atom:updated']) ?? textOf(raw['dc:date']) ?? textOf(raw['updated']),
  )

  const rawSummary = textOf(raw['description'])
  const rawContent =
    textOf(raw['content:encoded']) ?? textOf(raw['content']) ?? textOf(raw['xhtml:body'])

  const summary = sanitize ? sanitizeHtml(rawSummary) : rawSummary
  const content = sanitize ? sanitizeHtml(rawContent) : rawContent

  const author = textOf(raw['author']) ?? textOf(raw['dc:creator']) ?? textOf(raw['itunes:author'])

  const categories = extractRssCategories(raw)
  const enclosures = extractRssEnclosures(raw)

  const id = guid ?? link ?? synthesizeItemId(title, publishedAt)

  const item: NormalizedFeedItem = { id, title }
  if (link) item.link = link
  if (summary) item.summary = summary
  if (content) item.content = content
  if (author) item.author = author
  if (publishedAt) item.publishedAt = publishedAt
  if (updatedAt) item.updatedAt = updatedAt
  if (categories.length > 0) item.categories = categories
  if (enclosures.length > 0) item.enclosures = enclosures
  return item
}

/**
 *
 * @param raw
 */
function extractRssCategories(raw: Record<string, unknown>): string[] {
  const out: string[] = []
  for (const cat of toArray(raw['category'] as unknown)) {
    const text = textOf(cat)
    if (text) out.push(text)
  }
  // iTunes categories live under <itunes:category text="...">; collect
  // the top-level text attributes for podcast feeds.
  for (const cat of toArray(raw['itunes:category'] as unknown)) {
    const text = attrOf(cat, 'text')
    if (text) out.push(text)
  }
  return out
}

/**
 *
 * @param raw
 */
function extractRssEnclosures(raw: Record<string, unknown>): FeedEnclosure[] {
  const out: FeedEnclosure[] = []
  const itunesDuration = parseItunesDuration(textOf(raw['itunes:duration']))
  for (const enc of toArray(raw['enclosure'] as unknown)) {
    const url = attrOf(enc, 'url')
    if (!url) continue
    const length = attrOf(enc, 'length')
    const type = attrOf(enc, 'type')
    const enclosure: FeedEnclosure = { url }
    if (type) enclosure.type = type
    if (length) {
      const n = Number(length)
      if (Number.isFinite(n) && n >= 0) enclosure.length = n
    }
    if (itunesDuration !== undefined) enclosure.durationSeconds = itunesDuration
    out.push(enclosure)
  }
  return out
}
