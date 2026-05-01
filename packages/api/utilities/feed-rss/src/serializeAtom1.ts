/**
 * Atom 1.0 serializer — accepts a {@link Feed} structure and returns a
 * complete Atom 1.0 XML document string.
 *
 * @module
 */

import { escapeAttr, escapeUrl, escapeXml, wrapCdata } from './escape.js'
import type { Feed, FeedAuthor, FeedItem, SerializeAtom1Options } from './types.js'
import { assertFeedShape, indent, toIso } from './utilities.js'

const ATOM_NS = 'http://www.w3.org/2005/Atom'

/**
 * Render an `<author>` block. Atom requires `<name>`; `<email>` and
 * `<uri>` are optional. The `name` is supplied by callers — empty names
 * fall back to `'Anonymous'` to keep the document well-formed.
 *
 * @param author - The author record.
 * @param pretty - Whether to pretty-print children.
 * @returns `<author>...</author>` XML string.
 */
function renderAuthor(author: FeedAuthor, pretty: boolean): string {
  const name = author.name && author.name !== '' ? author.name : 'Anonymous'
  const parts: string[] = [`<name>${escapeXml(name)}</name>`]
  if (author.email) parts.push(`<email>${escapeXml(author.email)}</email>`)
  if (author.url) parts.push(`<uri>${escapeUrl(author.url)}</uri>`)
  if (!pretty) return `<author>${parts.join('')}</author>`
  return `<author>\n${indent(parts.join('\n'), 2)}\n</author>`
}

/**
 * Render a single `<entry>`.
 *
 * @param item - Feed item.
 * @param feedUpdated - ISO timestamp used as `<updated>` fallback.
 * @param pretty - Whether to pretty-print children.
 * @returns `<entry>...</entry>` XML string.
 */
function renderEntry(item: FeedItem, feedUpdated: string, pretty: boolean): string {
  const lines: string[] = []
  lines.push(`<id>${escapeXml(item.id)}</id>`)
  lines.push(`<title>${escapeXml(item.title)}</title>`)

  if (item.link) {
    lines.push(`<link rel="alternate" href="${escapeAttr(item.link)}"/>`)
  }

  // Atom requires <updated>. Fall back: item.updatedAt → publishedAt → feed updated.
  const updated = toIso(item.updatedAt) ?? toIso(item.publishedAt) ?? feedUpdated
  lines.push(`<updated>${escapeXml(updated)}</updated>`)

  const published = toIso(item.publishedAt)
  if (published) lines.push(`<published>${escapeXml(published)}</published>`)

  if (item.authors) {
    for (const author of item.authors) {
      lines.push(renderAuthor(author, pretty))
    }
  }

  if (item.categories) {
    for (const cat of item.categories) {
      lines.push(`<category term="${escapeAttr(cat)}"/>`)
    }
  }

  if (item.summary !== undefined) {
    lines.push(`<summary type="html">${wrapCdata(item.summary)}</summary>`)
  }

  if (item.content !== undefined) {
    const isHtml = item.contentIsHtml !== false
    if (isHtml) {
      lines.push(`<content type="html">${wrapCdata(item.content)}</content>`)
    } else {
      lines.push(`<content type="text">${escapeXml(item.content)}</content>`)
    }
  }

  if (item.enclosures) {
    for (const enc of item.enclosures) {
      const attrs = [
        `rel="enclosure"`,
        `href="${escapeAttr(enc.url)}"`,
        `type="${escapeAttr(enc.type ?? 'application/octet-stream')}"`,
      ]
      if (Number.isFinite(enc.length)) attrs.push(`length="${escapeAttr(String(enc.length))}"`)
      if (enc.title) attrs.push(`title="${escapeAttr(enc.title)}"`)
      lines.push(`<link ${attrs.join(' ')}/>`)
    }
  }

  if (!pretty) return `<entry>${lines.join('')}</entry>`
  return `<entry>\n${indent(lines.join('\n'), 2)}\n</entry>`
}

/**
 * Serialize a {@link Feed} to a complete Atom 1.0 XML document.
 *
 * Conforms to RFC 4287:
 * - Declares `xmlns="http://www.w3.org/2005/Atom"` on the root.
 * - Always emits required `<id>`, `<title>`, `<updated>` elements.
 * - Each entry has `<id>`, `<title>`, `<updated>`.
 * - HTML content is wrapped in CDATA inside `<content type="html">` /
 *   `<summary type="html">`. Plain-text content uses `type="text"` with
 *   raw escaping.
 *
 * **All user-supplied content is escaped** — text fields run through
 * {@link escapeXml}, attribute values through {@link escapeAttr}, URLs
 * through {@link escapeUrl} (which neutralizes `javascript:` URIs), and
 * HTML-bearing fields are CDATA-wrapped via {@link wrapCdata}.
 *
 * @example
 * ```ts
 * import { serializeAtom1 } from '@molecule/api-feed-rss'
 *
 * const xml = serializeAtom1({
 *   title: 'My Blog',
 *   link: 'https://example.com',
 *   description: 'Posts about software',
 *   feedUrl: 'https://example.com/feed.atom',
 *   updatedAt: new Date(),
 *   items: [
 *     {
 *       id: 'urn:uuid:123',
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
 * @param options - See {@link SerializeAtom1Options}.
 * @returns Complete Atom 1.0 XML document string.
 * @throws {@link FeedSerializeError} when required fields are missing.
 */
export function serializeAtom1(feed: Feed, options: SerializeAtom1Options = {}): string {
  assertFeedShape(feed, 'atom-1.0')
  const pretty = options.pretty !== false
  const xmlDecl = options.xmlDeclaration ?? '<?xml version="1.0" encoding="UTF-8"?>'
  const feedUpdated = toIso(feed.updatedAt) ?? new Date().toISOString()

  const root: string[] = []
  // <id> for the feed: the feedUrl if set, else the link.
  const feedId = feed.feedUrl ?? feed.link
  root.push(`<id>${escapeXml(feedId)}</id>`)
  root.push(`<title>${escapeXml(feed.title)}</title>`)
  if (feed.description) {
    root.push(`<subtitle>${escapeXml(feed.description)}</subtitle>`)
  }
  root.push(`<updated>${escapeXml(feedUpdated)}</updated>`)
  root.push(`<link rel="alternate" href="${escapeAttr(feed.link)}"/>`)
  if (feed.feedUrl) {
    root.push(`<link rel="self" href="${escapeAttr(feed.feedUrl)}" type="application/atom+xml"/>`)
  }
  if (feed.language) {
    // Atom uses xml:lang on the root, but we also expose it as an element
    // for convenience. The xml:lang attribute is added on the root open tag below.
  }
  if (feed.imageUrl) {
    root.push(`<logo>${escapeUrl(feed.imageUrl)}</logo>`)
    root.push(`<icon>${escapeUrl(feed.imageUrl)}</icon>`)
  }
  if (feed.copyright) {
    root.push(`<rights>${escapeXml(feed.copyright)}</rights>`)
  }
  if (feed.authors) {
    for (const author of feed.authors) {
      root.push(renderAuthor(author, pretty))
    }
  }

  for (const item of feed.items) {
    root.push(renderEntry(item, feedUpdated, pretty))
  }

  const langAttr = feed.language ? ` xml:lang="${escapeAttr(feed.language)}"` : ''
  if (!pretty) {
    return `${xmlDecl}<feed xmlns="${ATOM_NS}"${langAttr}>${root.join('')}</feed>`
  }
  return `${xmlDecl}\n<feed xmlns="${ATOM_NS}"${langAttr}>\n${indent(root.join('\n'), 2)}\n</feed>`
}
