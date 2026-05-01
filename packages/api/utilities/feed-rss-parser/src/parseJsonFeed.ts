import { sanitizeHtml } from './sanitize.js'
import type { FeedEnclosure, NormalizedFeed, NormalizedFeedItem, ParsedFeed } from './types.js'
import { FeedParseError } from './types.js'
import { synthesizeItemId, toIsoDate } from './utilities.js'

interface ParseJsonFeedArgs {
  /** The raw response body. */
  body: string
  /** Whether to run {@link sanitizeHtml} on `summary` / `content` fields. */
  sanitize: boolean
}

/**
 * Parse a JSON Feed 1.0 / 1.1 body into the normalized {@link ParsedFeed} shape.
 *
 * @param args - Raw body plus options.
 * @param args.body
 * @param args.sanitize
 * @returns Normalized feed + items.
 * @throws {@link FeedParseError} when the body is not valid JSON or lacks a `feed` shape.
 */
export function parseJsonFeed({ body, sanitize }: ParseJsonFeedArgs): ParsedFeed {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch (err) {
    throw new FeedParseError(`Invalid JSON Feed body: ${(err as Error).message}`, 'json-feed')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new FeedParseError('JSON Feed body is not an object', 'json-feed')
  }
  const obj = parsed as Record<string, unknown>

  const feed: NormalizedFeed = {
    title: typeof obj['title'] === 'string' ? obj['title'] : '',
    description: stringOrUndefined(obj['description']),
    link: stringOrUndefined(obj['home_page_url']),
    feedUrl: stringOrUndefined(obj['feed_url']),
    language: stringOrUndefined(obj['language']),
    author: extractJsonAuthor(obj['author'] ?? obj['authors']),
    imageUrl: stringOrUndefined(obj['icon']) ?? stringOrUndefined(obj['favicon']),
    format: 'json-feed',
  }

  const rawItems = Array.isArray(obj['items']) ? (obj['items'] as unknown[]) : []
  const items: NormalizedFeedItem[] = rawItems
    .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
    .map((raw) => buildJsonFeedItem(raw, sanitize))

  return { feed, items }
}

/**
 *
 * @param value
 */
function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 *
 * @param value
 */
function extractJsonAuthor(value: unknown): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return extractJsonAuthor(value[0])
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return stringOrUndefined(obj['name']) ?? stringOrUndefined(obj['url'])
  }
  return stringOrUndefined(value)
}

/**
 *
 * @param raw
 * @param sanitize
 */
function buildJsonFeedItem(raw: Record<string, unknown>, sanitize: boolean): NormalizedFeedItem {
  const title = stringOrUndefined(raw['title']) ?? ''
  const link = stringOrUndefined(raw['url']) ?? stringOrUndefined(raw['external_url'])
  const guid = stringOrUndefined(raw['id'])
  const publishedAt = toIsoDate(stringOrUndefined(raw['date_published']))
  const updatedAt = toIsoDate(stringOrUndefined(raw['date_modified']))

  const rawSummary = stringOrUndefined(raw['summary'])
  const rawContent =
    stringOrUndefined(raw['content_html']) ?? stringOrUndefined(raw['content_text'])
  const summary = sanitize ? sanitizeHtml(rawSummary) : rawSummary
  const content = sanitize ? sanitizeHtml(rawContent) : rawContent

  const author = extractJsonAuthor(raw['author'] ?? raw['authors'])

  const tags = Array.isArray(raw['tags'])
    ? (raw['tags'] as unknown[]).filter((t): t is string => typeof t === 'string' && t !== '')
    : []

  const enclosures: FeedEnclosure[] = []
  if (Array.isArray(raw['attachments'])) {
    for (const att of raw['attachments'] as unknown[]) {
      if (!att || typeof att !== 'object') continue
      const obj = att as Record<string, unknown>
      const url = stringOrUndefined(obj['url'])
      if (!url) continue
      const enclosure: FeedEnclosure = { url }
      const mime = stringOrUndefined(obj['mime_type'])
      if (mime) enclosure.type = mime
      const sizeBytes = obj['size_in_bytes']
      if (typeof sizeBytes === 'number' && Number.isFinite(sizeBytes) && sizeBytes >= 0) {
        enclosure.length = sizeBytes
      }
      const title = stringOrUndefined(obj['title'])
      if (title) enclosure.title = title
      const duration = obj['duration_in_seconds']
      if (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0) {
        enclosure.durationSeconds = duration
      }
      enclosures.push(enclosure)
    }
  }

  const id = guid ?? link ?? synthesizeItemId(title, publishedAt)

  const item: NormalizedFeedItem = { id, title }
  if (link) item.link = link
  if (summary) item.summary = summary
  if (content) item.content = content
  if (author) item.author = author
  if (publishedAt) item.publishedAt = publishedAt
  if (updatedAt) item.updatedAt = updatedAt
  if (tags.length > 0) item.categories = tags
  if (enclosures.length > 0) item.enclosures = enclosures
  return item
}
