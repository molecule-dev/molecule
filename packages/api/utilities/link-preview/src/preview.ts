/**
 * Top-level {@link getLinkPreview} entry point.
 *
 * @module
 */

import { fetchHtml } from './fetcher.js'
import { parseHtml } from './parse.js'
import type { GetLinkPreviewOptions, LinkPreview } from './types.js'

/**
 * Fetch `url`, extract Open Graph / Twitter Card / oEmbed metadata, and
 * return a normalized {@link LinkPreview}.
 *
 * Honors:
 *
 * - SSRF guard — rejects private/loopback/link-local hosts unless
 *   `allowPrivateNetworks: true` is passed.
 * - Manual redirect following with per-hop SSRF re-validation.
 * - Total timeout via `AbortController` (default 5s).
 * - Body-size cap (default 1 MiB) — bodies larger than the cap are
 *   truncated and parsed as far as possible.
 * - Content-type guard — rejects PDFs, images, audio, video, JSON, …
 *   (anything outside `text/html` / `application/xhtml+xml` unless
 *   `acceptedContentTypes` is overridden).
 * - Optional response cache (`@molecule/api-cache`-compatible).
 *
 * Locale bonds are intentionally not used — error messages on the
 * thrown {@link import('./types.js').LinkPreviewError} are
 * developer-facing English (handler-error pattern). Consumers should
 * map `error.code` to translated user-facing strings in the calling
 * handler.
 *
 * @param url - URL to preview. Must be `http:` or `https:`.
 * @param options - Caller-supplied options. See
 *   {@link GetLinkPreviewOptions}.
 * @returns Normalized link-preview metadata.
 * @throws {import('./types.js').LinkPreviewError} on any failure.
 */
export async function getLinkPreview(
  url: string,
  options: GetLinkPreviewOptions = {},
): Promise<LinkPreview> {
  const cache = options.cache
  if (cache) {
    const cached = await cache.get(url)
    if (cached) return cached
  }

  const { body, finalUrl } = await fetchHtml(url, options)
  const preview = parseHtml(body, finalUrl)

  if (cache) {
    await cache.set(url, preview, options.cacheTtlMs ?? 600_000)
  }

  return preview
}
