/**
 * JSON Feed 1.1 serializer — accepts a {@link Feed} structure and returns
 * a complete JSON Feed document string.
 *
 * @module
 */

import type { Feed, FeedAuthor, SerializeJsonFeedOptions } from './types.js'
import { assertFeedShape, toIso } from './utilities.js'

const JSON_FEED_VERSION = 'https://jsonfeed.org/version/1.1'

/**
 * Map a {@link FeedAuthor} to the JSON Feed 1.1 author shape.
 *
 * @param author - The author record.
 * @returns Object containing the populated subset of name / url / avatar.
 */
function jsonAuthor(author: FeedAuthor): Record<string, string> {
  const out: Record<string, string> = {}
  if (author.name) out.name = author.name
  if (author.url) out.url = author.url
  if (author.avatarUrl) out.avatar = author.avatarUrl
  return out
}

/**
 * Serialize a {@link Feed} to a complete JSON Feed 1.1 document.
 *
 * The output conforms to https://www.jsonfeed.org/version/1.1/ — the
 * entire payload is built as plain JS objects then `JSON.stringify`-ed,
 * so all string content is naturally JSON-escaped. No CDATA / XML
 * escaping is applicable.
 *
 * @example
 * ```ts
 * import { serializeJsonFeed } from '@molecule/api-feed-rss'
 *
 * const json = serializeJsonFeed({
 *   title: 'My Blog',
 *   link: 'https://example.com',
 *   description: 'Posts about software',
 *   feedUrl: 'https://example.com/feed.json',
 *   items: [
 *     {
 *       id: 'https://example.com/posts/hello',
 *       title: 'Hello, world!',
 *       link: 'https://example.com/posts/hello',
 *       publishedAt: new Date(),
 *       content: '<p>First post.</p>',
 *     },
 *   ],
 * }, { pretty: true })
 * ```
 *
 * @param feed - The feed structure to serialize.
 * @param options - See {@link SerializeJsonFeedOptions}.
 * @returns Complete JSON Feed 1.1 document string.
 * @throws {FeedSerializeError} when required fields are missing.
 */
export function serializeJsonFeed(feed: Feed, options: SerializeJsonFeedOptions = {}): string {
  assertFeedShape(feed, 'json-feed')

  const out: Record<string, unknown> = {
    version: JSON_FEED_VERSION,
    title: feed.title,
    home_page_url: feed.link,
  }

  if (feed.feedUrl) out.feed_url = feed.feedUrl
  if (feed.description) out.description = feed.description
  if (feed.language) out.language = feed.language
  if (feed.imageUrl) {
    out.icon = feed.imageUrl
    out.favicon = feed.imageUrl
  }

  if (feed.authors && feed.authors.length > 0) {
    out.authors = feed.authors.map(jsonAuthor)
  }

  out.items = feed.items.map((item) => {
    const obj: Record<string, unknown> = {
      id: item.id,
      title: item.title,
    }
    if (item.link) {
      obj.url = item.link
      obj.external_url = item.link
    }
    if (item.summary !== undefined) obj.summary = item.summary

    if (item.content !== undefined) {
      const isHtml = item.contentIsHtml !== false
      if (isHtml) obj.content_html = item.content
      else obj.content_text = item.content
    }

    const datePublished = toIso(item.publishedAt)
    if (datePublished) obj.date_published = datePublished
    const dateModified = toIso(item.updatedAt)
    if (dateModified) obj.date_modified = dateModified

    if (item.authors && item.authors.length > 0) {
      obj.authors = item.authors.map(jsonAuthor)
    }

    if (item.categories && item.categories.length > 0) {
      obj.tags = [...item.categories]
    }

    if (item.enclosures && item.enclosures.length > 0) {
      obj.attachments = item.enclosures.map((enc) => {
        const att: Record<string, unknown> = {
          url: enc.url,
          mime_type: enc.type ?? 'application/octet-stream',
        }
        if (Number.isFinite(enc.length)) att.size_in_bytes = enc.length
        if (Number.isFinite(enc.durationSeconds)) {
          att.duration_in_seconds = enc.durationSeconds
        }
        if (enc.title) att.title = enc.title
        return att
      })
    }

    return obj
  })

  return options.pretty ? JSON.stringify(out, null, 2) : JSON.stringify(out)
}
