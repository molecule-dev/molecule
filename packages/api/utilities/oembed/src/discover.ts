/**
 * oEmbed discovery — finds the
 * `<link rel="alternate" type="application/json+oembed" href="...">`
 * element in an HTML document and returns the absolute discovery URL.
 *
 * @module
 */

/**
 * Slice the `<head>` region of an HTML document, falling back to the
 * first 256 KiB if no `</head>` is present. Limits regex scope and is
 * cheap.
 *
 * @param html - Full HTML body.
 * @returns The substring most likely to contain `<link>` tags.
 */
function getHeadRegion(html: string): string {
  const headEnd = html.search(/<\/head\s*>/i)
  if (headEnd > 0) return html.slice(0, headEnd)
  return html.length > 262_144 ? html.slice(0, 262_144) : html
}

/**
 * Decode the most common HTML entities found in attribute values.
 *
 * @param raw - Raw string from an HTML attribute value.
 * @returns Decoded string suitable for use as a URL.
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
}

/**
 * Find the JSON oEmbed discovery URL inside an HTML document.
 *
 * Looks for the first
 * `<link rel="alternate" type="application/json+oembed" href="...">`
 * tag in the `<head>` region. The XML variant
 * (`type="text/xml+oembed"`) is intentionally ignored — this consumer
 * only speaks JSON.
 *
 * @param html - HTML body.
 * @param baseUrl - Final URL of the page (for relative `href`
 *   resolution).
 * @returns Absolute oEmbed discovery URL, or `undefined` if not
 *   present.
 */
export function discoverOembedUrl(html: string, baseUrl: string): string | undefined {
  const head = getHeadRegion(html)
  // Match either attribute order: rel before type, or type before rel.
  const linkRe = /<link\s[^>]*?type\s*=\s*["']application\/json\+oembed["'][^>]*>/i
  const tag = head.match(linkRe)
  if (!tag) return undefined
  const hrefMatch = tag[0].match(/href\s*=\s*["']([^"']+)["']/i)
  if (!hrefMatch || !hrefMatch[1]) return undefined
  const href = decodeEntities(hrefMatch[1]).trim()
  if (!href) return undefined
  try {
    return new URL(href, baseUrl).toString()
  } catch (_error) {
    // Malformed href is an expected/normal case (bad publisher markup);
    // returning undefined is the correct contract — no log needed.
    return undefined
  }
}
