/**
 * Built-in oEmbed provider registry.
 *
 * Maps URL patterns to oEmbed endpoints for the most common providers
 * so that we can skip HTML discovery (one fewer round trip) for them.
 * Patterns are checked in order and the first match wins.
 *
 * Sources:
 *
 * - YouTube — https://www.youtube.com/oembed
 * - Vimeo — https://vimeo.com/api/oembed.json
 * - Twitter / X — https://publish.twitter.com/oembed
 * - SoundCloud — https://soundcloud.com/oembed?format=json
 * - Spotify — https://open.spotify.com/oembed
 * - Codepen — https://codepen.io/api/oembed
 *
 * @module
 */

import type { OEmbedProvider } from './types.js'

/**
 * Built-in provider table. Order matters: more-specific entries (e.g.
 * `youtu.be` before `youtube.com`) appear first.
 */
export const builtinProviders: OEmbedProvider[] = [
  {
    name: 'YouTube',
    match: /^https?:\/\/(?:www\.)?youtube\.com\/(?:watch\?|embed\/|shorts\/|playlist\?)/i,
    endpoint: 'https://www.youtube.com/oembed?format=json',
  },
  {
    name: 'YouTube',
    match: /^https?:\/\/youtu\.be\//i,
    endpoint: 'https://www.youtube.com/oembed?format=json',
  },
  {
    name: 'Vimeo',
    match: /^https?:\/\/(?:www\.)?vimeo\.com\/(?:\d+|channels\/|groups\/)/i,
    endpoint: 'https://vimeo.com/api/oembed.json',
  },
  {
    name: 'Twitter',
    match: /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/i,
    endpoint: 'https://publish.twitter.com/oembed?format=json',
  },
  {
    name: 'SoundCloud',
    match: /^https?:\/\/(?:www\.)?soundcloud\.com\//i,
    endpoint: 'https://soundcloud.com/oembed?format=json',
  },
  {
    name: 'Spotify',
    match: /^https?:\/\/open\.spotify\.com\/(?:track|album|artist|playlist|episode|show)\//i,
    endpoint: 'https://open.spotify.com/oembed',
  },
  {
    name: 'CodePen',
    match: /^https?:\/\/codepen\.io\/[^/]+\/(?:pen|details|full)\//i,
    endpoint: 'https://codepen.io/api/oembed?format=json',
  },
]

/**
 * Find the first matching provider for `url` from `providers`,
 * falling back to {@link builtinProviders}. Caller-supplied entries
 * are tested BEFORE built-ins so consumers can override defaults.
 *
 * @param url - URL to embed.
 * @param providers - Optional caller-supplied provider list. Tested
 *   before the built-ins.
 * @returns The first matching provider, or `undefined` if none match.
 */
export function findProvider(
  url: string,
  providers: OEmbedProvider[] = [],
): OEmbedProvider | undefined {
  for (const p of providers) {
    if (p.match.test(url)) return p
  }
  for (const p of builtinProviders) {
    if (p.match.test(url)) return p
  }
  return undefined
}

/**
 * Build the final oEmbed endpoint URL for `provider` + `targetUrl`,
 * appending the `url`, `maxwidth`, and `maxheight` query parameters
 * as necessary.
 *
 * @param provider - Matched provider entry.
 * @param targetUrl - The URL to be embedded.
 * @param maxWidth - Optional `maxwidth` parameter.
 * @param maxHeight - Optional `maxheight` parameter.
 * @returns Fully-formed oEmbed endpoint URL.
 */
export function buildProviderEndpoint(
  provider: OEmbedProvider,
  targetUrl: string,
  maxWidth?: number,
  maxHeight?: number,
): string {
  const sep = provider.endpoint.includes('?') ? '&' : '?'
  const params = new URLSearchParams()
  params.set('url', targetUrl)
  if (typeof maxWidth === 'number') params.set('maxwidth', String(maxWidth))
  if (typeof maxHeight === 'number') params.set('maxheight', String(maxHeight))
  return `${provider.endpoint}${sep}${params.toString()}`
}
