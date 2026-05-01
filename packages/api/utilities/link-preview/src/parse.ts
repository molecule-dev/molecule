/**
 * Lightweight metadata extraction from HTML.
 *
 * Avoids a full DOM parser — uses targeted regex over the `<head>`
 * region for `<meta property="og:...">`, `<meta name="twitter:...">`,
 * `<title>`, `<meta name="description">`, and oEmbed `<link>` tags.
 *
 * @module
 */

import { LinkPreview } from './types.js'

/**
 * Decode the most common HTML entities found in `content` attributes.
 * Limited on purpose — we don't pull in a full entity table.
 *
 * @param raw - Raw string from an HTML attribute value.
 * @returns Decoded string suitable for end-user display.
 */
function decodeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_match: string, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match: string, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
}

/**
 * Slice the `<head>` region of an HTML document, falling back to the
 * first 256 KiB if no `</head>` is present. Limits regex scope and is
 * cheap.
 *
 * @param html - Full HTML body (already truncated to the configured
 *   maximum size by the caller).
 * @returns The substring most likely to contain metadata tags.
 */
function getHeadRegion(html: string): string {
  const headEnd = html.search(/<\/head\s*>/i)
  if (headEnd > 0) return html.slice(0, headEnd)
  return html.length > 262_144 ? html.slice(0, 262_144) : html
}

/**
 * Extract a single `<meta>` tag's `content` value by scanning for an
 * attribute matching `attrName="attrValue"` in either order. Returns
 * the first match (per OG/Twitter spec, first wins).
 *
 * @param head - Head region of the HTML.
 * @param attrName - Attribute name (`property` or `name`).
 * @param attrValue - Expected attribute value (`og:title`, `twitter:image`, …).
 * @returns Decoded `content` value, or `undefined` if no match.
 */
function getMetaContent(
  head: string,
  attrName: 'property' | 'name',
  attrValue: string,
): string | undefined {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Pattern 1: <meta property="og:title" content="...">
  const re1 = new RegExp(
    `<meta\\s[^>]*?${attrName}\\s*=\\s*["']${escaped}["'][^>]*?content\\s*=\\s*["']([^"']*)["']`,
    'i',
  )
  // Pattern 2: <meta content="..." property="og:title">
  const re2 = new RegExp(
    `<meta\\s[^>]*?content\\s*=\\s*["']([^"']*)["'][^>]*?${attrName}\\s*=\\s*["']${escaped}["']`,
    'i',
  )

  const m1 = head.match(re1)
  if (m1 && m1[1]) return decodeEntities(m1[1]).trim()
  const m2 = head.match(re2)
  if (m2 && m2[1]) return decodeEntities(m2[1]).trim()
  return undefined
}

/**
 * Extract the `<title>` element's text content.
 *
 * @param head - Head region of the HTML.
 * @returns Decoded title text, or `undefined`.
 */
function getTitle(head: string): string | undefined {
  const m = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m || !m[1]) return undefined
  return decodeEntities(m[1]).trim() || undefined
}

/**
 * Extract the oEmbed discovery URL from a `<link rel="alternate"
 * type="application/json+oembed" href="...">` tag.
 *
 * @param head - Head region of the HTML.
 * @returns The `href` attribute, or `undefined`.
 */
function getOembedUrl(head: string): string | undefined {
  const re = /<link\s[^>]*?type\s*=\s*["']application\/json\+oembed["'][^>]*>/i
  const tag = head.match(re)
  if (!tag) return undefined
  const href = tag[0].match(/href\s*=\s*["']([^"']+)["']/i)
  if (!href || !href[1]) return undefined
  return decodeEntities(href[1]).trim() || undefined
}

/**
 * Resolve a possibly-relative URL against a base URL. Returns the
 * absolute string, or `undefined` if it cannot be parsed.
 *
 * @param maybeRelative - URL string from the HTML.
 * @param baseUrl - Final resolved page URL (used as the resolution
 *   base).
 * @returns Absolute URL string, or `undefined`.
 */
export function resolveUrl(maybeRelative: string | undefined, baseUrl: string): string | undefined {
  if (!maybeRelative) return undefined
  try {
    return new URL(maybeRelative, baseUrl).toString()
  } catch {
    return undefined
  }
}

/**
 * Parse an HTML document into a {@link LinkPreview} record.
 *
 * @param html - HTML body (already truncated to a safe size by the
 *   caller).
 * @param finalUrl - The final URL after redirects — used as the base
 *   for relative URL resolution and the `url` field in the output.
 * @returns Normalized link-preview metadata. All fields except `url`
 *   may be `undefined`.
 */
export function parseHtml(html: string, finalUrl: string): LinkPreview {
  const head = getHeadRegion(html)

  const ogTitle = getMetaContent(head, 'property', 'og:title')
  const twitterTitle = getMetaContent(head, 'name', 'twitter:title')
  const docTitle = getTitle(head)

  const ogDescription = getMetaContent(head, 'property', 'og:description')
  const twitterDescription = getMetaContent(head, 'name', 'twitter:description')
  const metaDescription = getMetaContent(head, 'name', 'description')

  const ogImage =
    getMetaContent(head, 'property', 'og:image') ??
    getMetaContent(head, 'property', 'og:image:url') ??
    getMetaContent(head, 'property', 'og:image:secure_url')
  const twitterImage =
    getMetaContent(head, 'name', 'twitter:image') ??
    getMetaContent(head, 'name', 'twitter:image:src')

  const ogSiteName = getMetaContent(head, 'property', 'og:site_name')
  const ogType = getMetaContent(head, 'property', 'og:type')

  const oembedUrl = getOembedUrl(head)

  let siteName = ogSiteName
  if (!siteName) {
    try {
      siteName = new URL(finalUrl).hostname
    } catch {
      siteName = undefined
    }
  }

  return {
    title: ogTitle ?? twitterTitle ?? docTitle,
    description: ogDescription ?? twitterDescription ?? metaDescription,
    image: resolveUrl(ogImage ?? twitterImage, finalUrl),
    siteName,
    url: finalUrl,
    type: ogType ?? 'website',
    oembedUrl: resolveUrl(oembedUrl, finalUrl),
  }
}
