/**
 * Top-level {@link oembed} entry point.
 *
 * Resolves a URL into a normalized {@link OEmbedResponse} via either
 * the built-in provider registry (YouTube/Vimeo/Twitter/SoundCloud/
 * Spotify/Codepen — direct endpoint, no discovery) or
 * `<link rel="alternate" type="application/json+oembed">` discovery
 * on the target page.
 *
 * @module
 */

import { discoverOembedUrl } from './discover.js'
import { fetchText, validateUrl } from './fetcher.js'
import { buildProviderEndpoint, findProvider } from './providers.js'
import { sanitizeHtml } from './sanitize.js'
import { OEmbedError, OEmbedOptions, OEmbedResponse, OEmbedType } from './types.js'

const VALID_TYPES: ReadonlySet<OEmbedType> = new Set(['photo', 'video', 'link', 'rich'])

/**
 * Parse a JSON oEmbed payload, normalize it, and sanitize any
 * embedded HTML.
 *
 * @param raw - Raw JSON string returned by the provider's oEmbed
 *   endpoint.
 * @param sourceUrl - URL of the oEmbed endpoint (used as the error
 *   context).
 * @returns Normalized {@link OEmbedResponse}.
 * @throws {OEmbedError} `invalid-oembed-payload` when the payload is
 *   not parseable JSON, not an object, or is missing the `type`
 *   field.
 */
function parseOembed(raw: string, sourceUrl: string): OEmbedResponse {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new OEmbedError('invalid-oembed-payload', 'oEmbed payload is not valid JSON', sourceUrl)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new OEmbedError(
      'invalid-oembed-payload',
      'oEmbed payload is not a JSON object',
      sourceUrl,
    )
  }

  const obj = parsed as Record<string, unknown>
  const type = obj['type']
  if (typeof type !== 'string' || !VALID_TYPES.has(type as OEmbedType)) {
    throw new OEmbedError(
      'invalid-oembed-payload',
      `oEmbed payload has invalid type: ${String(type)}`,
      sourceUrl,
    )
  }

  const version = typeof obj['version'] === 'string' ? (obj['version'] as string) : '1.0'

  const result: OEmbedResponse = { ...obj, type: type as OEmbedType, version }

  if (typeof result.html === 'string') {
    result.html = sanitizeHtml(result.html)
  } else if (result.html !== undefined) {
    delete result.html
  }

  // Coerce common numeric fields when the provider returns them as
  // strings (some implementations are loose with types).
  for (const key of ['width', 'height', 'thumbnail_width', 'thumbnail_height', 'cache_age']) {
    const value = result[key]
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      result[key] = Number.parseInt(value, 10)
    }
  }

  return result
}

/**
 * Discover and fetch the normalized oEmbed payload for `url`.
 *
 * Resolution strategy:
 *
 * 1. Validate `url` (protocol + SSRF guard).
 * 2. If a built-in or caller-supplied provider matches, use that
 *    provider's oEmbed endpoint directly — skips HTML discovery.
 * 3. Otherwise, fetch the HTML and look for a
 *    `<link rel="alternate" type="application/json+oembed">` tag.
 * 4. Fetch the discovered endpoint, validate the JSON payload, and
 *    sanitize any embedded `html`.
 *
 * Honors:
 *
 * - SSRF guard — rejects private/loopback/link-local hosts unless
 *   `allowPrivateNetworks: true` is passed (applies to the input
 *   URL, every redirect hop, AND the discovered oEmbed endpoint).
 * - Manual redirect following with per-hop SSRF re-validation.
 * - Total per-request timeout via `AbortController` (default 5s).
 * - Body-size cap (default 256 KiB for oEmbed JSON; HTML discovery
 *   uses the same cap).
 * - HTML sanitization — `<script>` blocks and `on*=` attributes are
 *   stripped from the returned `html` field; `javascript:` URLs are
 *   neutralized.
 * - Optional response cache (`@molecule/api-cache`-compatible).
 *
 * Locale bonds are intentionally not used — error messages on the
 * thrown {@link OEmbedError} are developer-facing English (handler-
 * error pattern). Consumers should map `error.code` to translated
 * user-facing strings in the calling handler.
 *
 * @param url - URL to embed. Must be `http:` or `https:`.
 * @param options - Caller-supplied options. See {@link OEmbedOptions}.
 * @returns Normalized {@link OEmbedResponse}.
 * @throws {OEmbedError} on any failure.
 */
export async function oembed(url: string, options: OEmbedOptions = {}): Promise<OEmbedResponse> {
  const cache = options.cache
  if (cache) {
    const cached = await cache.get(url)
    if (cached) return cached
  }

  const allowPrivate = options.allowPrivateNetworks === true
  // Validate up-front so we fail fast for bad input URLs even when
  // the matched provider's endpoint is itself a public URL.
  validateUrl(url, allowPrivate)

  let endpointUrl: string

  const provider = findProvider(url, options.providers)
  if (provider) {
    endpointUrl = buildProviderEndpoint(provider, url, options.maxWidth, options.maxHeight)
  } else {
    // Fall back to HTML discovery.
    const html = await fetchText(url, {
      fetch: options.fetch,
      userAgent: options.userAgent,
      timeoutMs: options.timeoutMs,
      maxBodyBytes: options.maxBodyBytes ?? 1_048_576,
      maxRedirects: options.maxRedirects,
      allowPrivateNetworks: options.allowPrivateNetworks,
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      acceptedContentTypes: ['text/html', 'application/xhtml+xml'],
    })

    const discovered = discoverOembedUrl(html.body, html.finalUrl)
    if (!discovered) {
      throw new OEmbedError('no-oembed-endpoint', 'No oEmbed discovery link found on page', url)
    }

    // Forward maxwidth/maxheight onto the discovered URL when set.
    if (typeof options.maxWidth === 'number' || typeof options.maxHeight === 'number') {
      try {
        const u = new URL(discovered)
        if (typeof options.maxWidth === 'number')
          u.searchParams.set('maxwidth', String(options.maxWidth))
        if (typeof options.maxHeight === 'number')
          u.searchParams.set('maxheight', String(options.maxHeight))
        endpointUrl = u.toString()
      } catch {
        endpointUrl = discovered
      }
    } else {
      endpointUrl = discovered
    }
  }

  const json = await fetchText(endpointUrl, {
    fetch: options.fetch,
    userAgent: options.userAgent,
    timeoutMs: options.timeoutMs,
    maxBodyBytes: options.maxBodyBytes,
    maxRedirects: options.maxRedirects,
    allowPrivateNetworks: options.allowPrivateNetworks,
    accept: 'application/json,*/*;q=0.1',
    acceptedContentTypes: ['application/json', 'text/javascript', 'application/javascript'],
  })

  const response = parseOembed(json.body, endpointUrl)

  if (cache) {
    await cache.set(url, response, options.cacheTtlMs ?? 600_000)
  }

  return response
}
