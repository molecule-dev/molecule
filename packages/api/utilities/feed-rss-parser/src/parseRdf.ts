import { sanitizeHtml } from './sanitize.js'
import type { NormalizedFeed, NormalizedFeedItem, ParsedFeed } from './types.js'
import { firstText, synthesizeItemId, textOf, toArray, toIsoDate } from './utilities.js'

interface ParseRdfArgs {
  /** The fast-xml-parser document — already known to contain a `<rdf:RDF>` root. */
  doc: Record<string, unknown>
  /** Whether to run {@link sanitizeHtml} on `summary` / `content` fields. */
  sanitize: boolean
}

/**
 * Parse an RSS 1.0 / RDF document into the normalized {@link ParsedFeed} shape.
 *
 * @param args - Parsed XML document plus options.
 * @param args.doc
 * @param args.sanitize
 * @returns Normalized feed + items.
 */
export function parseRdf({ doc, sanitize }: ParseRdfArgs): ParsedFeed {
  // fast-xml-parser strips the `rdf:` prefix when `removeNSPrefix: true` is
  // set; we run with prefixes preserved so detection is unambiguous, then
  // index either form here.
  const rdf = (doc['rdf:RDF'] ?? doc['RDF'] ?? {}) as Record<string, unknown>
  const channel = (rdf['channel'] ?? {}) as Record<string, unknown>

  const feed: NormalizedFeed = {
    title: textOf(channel['title']) ?? '',
    description: textOf(channel['description']),
    link: firstText(channel['link']),
    language: textOf(channel['dc:language']) ?? textOf(channel['language']),
    updatedAt: toIsoDate(textOf(channel['dc:date']) ?? textOf(channel['lastBuildDate'])),
    author: textOf(channel['dc:creator']) ?? textOf(channel['managingEditor']),
    copyright: textOf(channel['dc:rights']) ?? textOf(channel['copyright']),
    format: 'rdf-1.0',
  }

  const rawItems = toArray<Record<string, unknown>>(
    rdf['item'] as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )

  const items: NormalizedFeedItem[] = rawItems.map((raw) => {
    const title = textOf(raw['title']) ?? ''
    const link = firstText(raw['link'])
    const publishedAt = toIsoDate(textOf(raw['dc:date']) ?? textOf(raw['pubDate']))
    const rawSummary = textOf(raw['description'])
    const rawContent = textOf(raw['content:encoded'])
    const summary = sanitize ? sanitizeHtml(rawSummary) : rawSummary
    const content = sanitize ? sanitizeHtml(rawContent) : rawContent
    const author = textOf(raw['dc:creator'])
    const categories: string[] = []
    for (const cat of toArray(raw['dc:subject'] as unknown)) {
      const text = textOf(cat)
      if (text) categories.push(text)
    }
    for (const cat of toArray(raw['category'] as unknown)) {
      const text = textOf(cat)
      if (text) categories.push(text)
    }
    const id = link ?? synthesizeItemId(title, publishedAt)
    const item: NormalizedFeedItem = { id, title }
    if (link) item.link = link
    if (summary) item.summary = summary
    if (content) item.content = content
    if (author) item.author = author
    if (publishedAt) item.publishedAt = publishedAt
    if (categories.length > 0) item.categories = categories
    return item
  })

  return { feed, items }
}
