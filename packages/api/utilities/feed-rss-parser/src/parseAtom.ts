import { sanitizeHtml } from './sanitize.js'
import type { FeedEnclosure, NormalizedFeed, NormalizedFeedItem, ParsedFeed } from './types.js'
import { attrOf, synthesizeItemId, textOf, toArray, toIsoDate } from './utilities.js'

interface ParseAtomArgs {
  /** The fast-xml-parser document — already known to contain a `<feed>` root. */
  doc: Record<string, unknown>
  /** Whether to run {@link sanitizeHtml} on `summary` / `content` fields. */
  sanitize: boolean
}

/**
 * Parse an Atom 1.0 document into the normalized {@link ParsedFeed} shape.
 *
 * @param args - Parsed XML document plus options.
 * @param args.doc
 * @param args.sanitize
 * @returns Normalized feed + items.
 */
export function parseAtom({ doc, sanitize }: ParseAtomArgs): ParsedFeed {
  const atom = (doc['feed'] ?? {}) as Record<string, unknown>
  const links = toArray(atom['link'] as unknown)
  const alternateLink = pickLink(links, 'alternate') ?? pickLink(links, undefined)
  const selfLink = pickLink(links, 'self')

  const updated = toIsoDate(textOf(atom['updated']))
  const language =
    attrOf(atom, 'xml:lang') ??
    textOf(atom['language']) ??
    (atom['@_xml:lang'] as string | undefined)

  const feed: NormalizedFeed = {
    title: textOf(atom['title']) ?? '',
    description: textOf(atom['subtitle']) ?? textOf(atom['summary']),
    link: alternateLink,
    feedUrl: selfLink,
    language,
    updatedAt: updated,
    author: extractAtomAuthor(atom['author']),
    copyright: textOf(atom['rights']),
    imageUrl: textOf(atom['logo']) ?? textOf(atom['icon']),
    format: 'atom-1.0',
  }

  const rawEntries = toArray<Record<string, unknown>>(
    atom['entry'] as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )

  const items: NormalizedFeedItem[] = rawEntries.map((raw) => buildAtomEntry(raw, sanitize))

  return { feed, items }
}

/**
 *
 * @param links
 * @param rel
 */
function pickLink(links: unknown[], rel: string | undefined): string | undefined {
  for (const link of links) {
    if (typeof link === 'string') {
      if (rel === undefined || rel === 'alternate') {
        const trimmed = link.trim()
        if (trimmed) return trimmed
      }
      continue
    }
    if (link && typeof link === 'object') {
      const obj = link as Record<string, unknown>
      const linkRel = (obj['@_rel'] as string | undefined) ?? 'alternate'
      const href = obj['@_href'] as string | undefined
      if (!href) continue
      if (rel === undefined && linkRel === 'alternate') return href
      if (rel !== undefined && linkRel === rel) return href
    }
  }
  return undefined
}

/**
 *
 * @param value
 */
function extractAtomAuthor(value: unknown): string | undefined {
  if (value == null) return undefined
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate === 'string') return candidate.trim() || undefined
  if (candidate && typeof candidate === 'object') {
    const obj = candidate as Record<string, unknown>
    return textOf(obj['name']) ?? textOf(obj['email'])
  }
  return undefined
}

/**
 *
 * @param raw
 * @param sanitize
 */
function buildAtomEntry(raw: Record<string, unknown>, sanitize: boolean): NormalizedFeedItem {
  const title = textOf(raw['title']) ?? ''
  const links = toArray(raw['link'] as unknown)
  const link = pickLink(links, 'alternate') ?? pickLink(links, undefined)
  const guid = textOf(raw['id'])
  const publishedAt = toIsoDate(textOf(raw['published']) ?? textOf(raw['issued']))
  const updatedAt = toIsoDate(textOf(raw['updated']) ?? textOf(raw['modified']))

  const rawSummary = textOf(raw['summary'])
  const rawContent = textOf(raw['content'])
  const summary = sanitize ? sanitizeHtml(rawSummary) : rawSummary
  const content = sanitize ? sanitizeHtml(rawContent) : rawContent

  const author = extractAtomAuthor(raw['author'])

  const categories: string[] = []
  for (const cat of toArray(raw['category'] as unknown)) {
    const term = attrOf(cat, 'term') ?? attrOf(cat, 'label') ?? textOf(cat)
    if (term) categories.push(term)
  }

  const enclosures: FeedEnclosure[] = []
  for (const link of links) {
    if (!link || typeof link !== 'object') continue
    const obj = link as Record<string, unknown>
    if (obj['@_rel'] !== 'enclosure') continue
    const url = obj['@_href'] as string | undefined
    if (!url) continue
    const enclosure: FeedEnclosure = { url }
    const type = obj['@_type'] as string | undefined
    if (type) enclosure.type = type
    const length = obj['@_length'] as string | undefined
    if (length) {
      const n = Number(length)
      if (Number.isFinite(n) && n >= 0) enclosure.length = n
    }
    const title = obj['@_title'] as string | undefined
    if (title) enclosure.title = title
    enclosures.push(enclosure)
  }

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
