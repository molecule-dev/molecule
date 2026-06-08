/**
 * HTTP fetchers used by the oEmbed consumer.
 *
 * Two flavors:
 *
 * - {@link fetchText} — used for both HTML discovery and JSON oEmbed
 *   payload retrieval. Manual redirects, body-size cap, hard timeout,
 *   per-hop SSRF re-validation.
 * - {@link validateUrl} — protocol + SSRF check only, used by the
 *   top-level entry point.
 *
 * @module
 */

import { isPrivateHost } from './ssrf.js'
import { OEmbedError, type OEmbedErrorCode, type OEmbedOptions } from './types.js'

/**
 * Default polite User-Agent — matches the link-preview convention.
 */
export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; molecule-oembed/1.0; +https://molecule.dev/bot)'

/**
 * Throw an {@link OEmbedError} with the given code/message/url.
 *
 * @param code - Stable error code.
 * @param message - English description.
 * @param url - URL being processed when the error occurred.
 */
function fail(code: OEmbedErrorCode, message: string, url: string): never {
  throw new OEmbedError(code, message, url)
}

/**
 * Validate a URL string. Rejects non-http(s) protocols, malformed
 * URLs, and (unless explicitly allowed) private network hosts.
 *
 * @param rawUrl - URL string to validate.
 * @param allowPrivate - If `true`, private/loopback/link-local hosts
 *   are permitted.
 * @returns The parsed `URL` object.
 */
export function validateUrl(rawUrl: string, allowPrivate: boolean): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch (_error) {
    // URL constructor throws a TypeError for malformed input; the error
    // object adds no diagnostic value — the raw string is already in the
    // OEmbedError we're about to throw.
    fail('invalid-url', `Invalid URL: ${rawUrl}`, rawUrl)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail('unsupported-protocol', `Unsupported URL protocol: ${parsed.protocol}`, rawUrl)
  }
  if (!allowPrivate && isPrivateHost(parsed.hostname)) {
    fail(
      'private-network-blocked',
      `Refusing to fetch private/loopback host: ${parsed.hostname}`,
      rawUrl,
    )
  }
  return parsed
}

/**
 * Result of a successful {@link fetchText} call.
 */
export interface FetchedText {
  /**
   * Truncated body bytes decoded as UTF-8 text.
   */
  body: string

  /**
   * Final URL after redirects.
   */
  finalUrl: string

  /**
   * Lowercased response content-type prefix (e.g. `text/html`,
   * `application/json`).
   */
  contentType: string
}

/**
 * Fetch options passed through {@link fetchText}.
 */
export interface FetchTextOptions extends Pick<
  OEmbedOptions,
  'fetch' | 'userAgent' | 'timeoutMs' | 'maxBodyBytes' | 'maxRedirects' | 'allowPrivateNetworks'
> {
  /**
   * Comma-separated `Accept` header value sent with the request.
   * Defaults to `*\/\*` so the same fetcher works for HTML discovery
   * and JSON oEmbed retrieval.
   */
  accept?: string

  /**
   * Allowed content-type prefixes. The response is rejected if its
   * `content-type` doesn't start with one of these. Pass `undefined`
   * to skip the check.
   */
  acceptedContentTypes?: string[]
}

/**
 * Fetch the body of `url` with manual redirect handling, total
 * timeout, and body-size cap. Returns the truncated body, final URL,
 * and content-type.
 *
 * Redirects are followed manually so each intermediate URL is
 * SSRF-validated — the built-in `redirect: 'follow'` mode would let a
 * malicious server bounce us to `127.0.0.1`.
 *
 * @param inputUrl - URL to fetch.
 * @param options - Fetch options.
 * @returns Truncated body + final URL + content-type.
 * @throws {OEmbedError} on any failure.
 */
export async function fetchText(
  inputUrl: string,
  options: FetchTextOptions = {},
): Promise<FetchedText> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    fail('fetch-failed', 'No fetch implementation available', inputUrl)
  }

  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT
  const timeoutMs = options.timeoutMs ?? 5_000
  const maxBodyBytes = options.maxBodyBytes ?? 262_144
  const maxRedirects = options.maxRedirects ?? 5
  const allowPrivate = options.allowPrivateNetworks === true
  const accept = options.accept ?? '*/*'
  const accepted = options.acceptedContentTypes?.map((s) => s.toLowerCase())

  let currentUrl = validateUrl(inputUrl, allowPrivate).toString()
  let redirects = 0

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    while (true) {
      let response: Response
      try {
        response = await fetchImpl(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'user-agent': userAgent,
            accept,
            'accept-language': 'en;q=0.9, *;q=0.5',
          },
        })
      } catch (err) {
        const error = err as { name?: string; message?: string }
        if (error?.name === 'AbortError') {
          fail('timeout', `Request timed out after ${timeoutMs}ms`, currentUrl)
        }
        fail('fetch-failed', `Fetch failed: ${error?.message ?? 'unknown error'}`, currentUrl)
      }

      const status = response.status

      // Redirect handling — covers 301, 302, 303, 307, 308 and any
      // other 3xx with a Location header. `fetch` with
      // `redirect: 'manual'` returns these without following.
      if (status >= 300 && status < 400) {
        const location = response.headers.get('location')
        if (!location) {
          fail('http-error', `HTTP ${status} without Location header`, currentUrl)
        }
        if (redirects >= maxRedirects) {
          fail('too-many-redirects', `Exceeded ${maxRedirects} redirects`, currentUrl)
        }
        let nextUrl: string
        try {
          nextUrl = new URL(location, currentUrl).toString()
        } catch (_error) {
          // URL constructor throws for a malformed Location header; the
          // error adds no value beyond what we include in the OEmbedError.
          fail('http-error', `Invalid redirect target: ${location}`, currentUrl)
        }
        validateUrl(nextUrl, allowPrivate)
        currentUrl = nextUrl
        redirects += 1
        continue
      }

      if (status < 200 || status >= 300) {
        fail('http-error', `HTTP ${status}`, currentUrl)
      }

      const contentType =
        (response.headers.get('content-type') ?? '').toLowerCase().split(';')[0]?.trim() ?? ''
      if (accepted && !accepted.some((t) => contentType.startsWith(t))) {
        fail(
          'unsupported-content-type',
          `Unsupported content-type: ${contentType || '(none)'}`,
          currentUrl,
        )
      }

      const body = await readTruncated(response, maxBodyBytes)
      return { body, finalUrl: currentUrl, contentType }
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Read up to `maxBytes` from a `Response.body` stream, returning the
 * UTF-8-decoded text. Cancels the stream once the cap is reached.
 *
 * @param response - Response from `fetch`.
 * @param maxBytes - Hard cap in bytes.
 * @returns Truncated body decoded as UTF-8 text.
 */
async function readTruncated(response: Response, maxBytes: number): Promise<string> {
  // Fast path: no streaming body (e.g. mocked Response in tests).
  if (!response.body) {
    const text = await response.text()
    if (text.length <= maxBytes) return text
    return text.slice(0, maxBytes)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const chunks: string[] = []
  let received = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (!value) continue
      const remaining = maxBytes - received
      if (remaining <= 0) {
        await reader.cancel()
        break
      }
      const slice = value.byteLength > remaining ? value.slice(0, remaining) : value
      chunks.push(decoder.decode(slice, { stream: true }))
      received += slice.byteLength
      if (received >= maxBytes) {
        await reader.cancel()
        break
      }
    }
    chunks.push(decoder.decode())
  } finally {
    try {
      reader.releaseLock()
    } catch (_error) {
      // releaseLock() throws if the lock was already released (e.g. the
      // reader was cancelled above); safe to ignore — the stream is gone.
    }
  }
  return chunks.join('')
}
