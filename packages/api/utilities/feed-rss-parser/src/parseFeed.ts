import { XMLParser } from 'fast-xml-parser'

import { parseAtom } from './parseAtom.js'
import { parseJsonFeed } from './parseJsonFeed.js'
import { parseRdf } from './parseRdf.js'
import { parseRss } from './parseRss.js'
import type { FeedFormat, ParsedFeed, ParseFeedOptions } from './types.js'
import { FeedParseError } from './types.js'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  // Preserve namespace prefixes (`itunes:duration`, `dc:creator`, `content:encoded`)
  // so each parser can pick out the metadata it needs.
  removeNSPrefix: false,
  // Atom + RSS commonly contain CDATA-wrapped HTML in description/content
  // fields. Flag those so callers see the inner string verbatim.
  cdataPropName: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  // Normalize duplicate <link> / <category> / <enclosure> elements into arrays
  // so the downstream parsers can iterate consistently.
  isArray: (name) =>
    name === 'item' ||
    name === 'entry' ||
    name === 'link' ||
    name === 'category' ||
    name === 'enclosure' ||
    name === 'author' ||
    name === 'itunes:category',
})

/**
 * Detect the source format of a feed body.
 *
 * Detection runs in this order:
 * 1. If `contentType` includes `json`, OR the trimmed body begins with `{`/`[`,
 *    return `'json-feed'` without parsing XML.
 * 2. Otherwise the XML root element selects the format:
 *    - `rss` → `'rss-2.0'`
 *    - `feed` → `'atom-1.0'`
 *    - `rdf:RDF` (or `RDF`) → `'rdf-1.0'`
 *
 * @param body - Raw body string.
 * @param contentType - Optional `Content-Type` header value from the HTTP response.
 * @returns Detected format, or `undefined` when the body cannot be classified.
 */
export function detectFeedFormat(
  body: string,
  contentType: string | undefined,
): FeedFormat | undefined {
  const ctLower = (contentType ?? '').toLowerCase()
  const trimmed = body.trimStart()
  if (ctLower.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json-feed'
  }
  // Cheap-but-deterministic root-element sniff before paying for a full parse.
  // We still parse for the actual extraction; this just selects a parser.
  const head = trimmed.slice(0, 2048)
  if (/<rss\b/i.test(head)) return 'rss-2.0'
  if (/<feed\b/i.test(head)) return 'atom-1.0'
  if (/<rdf:RDF\b/i.test(head) || /<RDF\b/i.test(head)) return 'rdf-1.0'
  return undefined
}

/**
 * Parse an RSS / Atom / RDF / JSON Feed body into a normalized
 * `{ feed, items[] }` shape.
 *
 * Pure function — no I/O, no state. Pass the response body and (optionally)
 * the HTTP `Content-Type` header. Format detection is automatic; pass
 * `options.format` to override.
 *
 * @example
 * ```ts
 * import { parseFeed } from '@molecule/api-feed-rss-parser'
 *
 * const res = await fetch('https://example.com/feed.xml')
 * const { feed, items } = parseFeed(await res.text(), {
 *   contentType: res.headers.get('content-type') ?? undefined,
 * })
 * console.log(feed.title, items.length)
 * ```
 *
 * @param body - The full HTTP response body. Required, must be non-empty.
 * @param options - Parser options. See {@link ParseFeedOptions}.
 * @returns Normalized feed + items.
 * @throws {@link FeedParseError} when the body cannot be classified or parsed.
 */
export function parseFeed(body: string, options: ParseFeedOptions = {}): ParsedFeed {
  if (typeof body !== 'string' || body.trim() === '') {
    throw new FeedParseError('Feed body is empty')
  }
  const sanitize = options.sanitizeHtml !== false
  const format = options.format ?? detectFeedFormat(body, options.contentType)
  if (!format) {
    throw new FeedParseError('Unable to detect feed format — pass options.format to override')
  }

  if (format === 'json-feed') {
    return parseJsonFeed({ body, sanitize })
  }

  let doc: Record<string, unknown>
  try {
    doc = xmlParser.parse(body) as Record<string, unknown>
  } catch (err) {
    throw new FeedParseError(`XML parse error: ${(err as Error).message}`, format)
  }

  if (format === 'rss-2.0') return parseRss({ doc, sanitize })
  if (format === 'atom-1.0') return parseAtom({ doc, sanitize })
  if (format === 'rdf-1.0') return parseRdf({ doc, sanitize })

  // Defensive — exhaustiveness guard for new FeedFormat values.
  throw new FeedParseError(`Unsupported feed format: ${format as string}`)
}
