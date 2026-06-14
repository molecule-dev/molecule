/**
 * oEmbed consumer.
 *
 * Resolves a URL into a normalized
 * `{ type, version, title?, author_name?, provider_name?,
 * thumbnail_url?, html?, width?, height?, ... }` payload by either:
 *
 * 1. Using a built-in provider registry (YouTube, Vimeo, Twitter/X,
 *    SoundCloud, Spotify, Codepen) to skip HTML discovery for popular
 *    providers, OR
 * 2. Fetching the target page and discovering the oEmbed endpoint via
 *    `<link rel="alternate" type="application/json+oembed">`.
 *
 * Used by blog (rich-link cards), discussion-boards, and productivity
 * apps (Notion-style embeds).
 *
 * Built-in safety:
 *
 * - SSRF guard refuses private/loopback/link-local hosts by default
 *   on every URL — input, redirects, AND the discovered oEmbed
 *   endpoint.
 * - HTML sanitization on `OEmbedResponse.html` strips `<script>`
 *   blocks, `on*=` event handlers, and `javascript:` URLs.
 * - Manual redirect handling re-validates each hop.
 * - Hard timeout (default 5s) via `AbortController`.
 * - Body-size cap (default 256 KiB for JSON, 1 MiB for HTML
 *   discovery).
 *
 * Pure HTTP fetch — no DOM, no headless browser. Works in any Node ≥
 * 20 runtime that ships `fetch`.
 *
 * @example
 * ```ts
 * import { oembed } from '@molecule/api-oembed'
 *
 * const embed = await oembed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // → { type: 'video', version: '1.0', title, html, width, height, ... }
 * ```
 *
 * @example
 * ```ts
 * // With a @molecule/api-cache-compatible adapter:
 * const embed = await oembed(url, {
 *   cache: myCacheAdapter,
 *   cacheTtlMs: 600_000,
 *   timeoutMs: 3_000,
 *   maxWidth: 640,
 * })
 * ```
 *
 * @remarks
 * Throws {@link OEmbedError} (`error.code` is one of `invalid-url`,
 * `private-network-blocked`, `unsupported-protocol`, `http-error`,
 * `unsupported-content-type`, `too-many-redirects`, `timeout`,
 * `fetch-failed`, `no-oembed-endpoint`, `invalid-oembed-payload`).
 * Map `error.code` to translated user-facing text in the calling
 * handler — this utility intentionally has no locale bond
 * (handler-error pattern).
 *
 * @module
 */

export * from './discover.js'
export * from './fetcher.js'
export * from './oembed.js'
export * from './providers.js'
export * from './sanitize.js'
export * from './ssrf.js'
export * from './types.js'
