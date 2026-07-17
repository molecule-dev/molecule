/**
 * URL preview / OG-image scraper.
 *
 * Fetches a URL and returns normalized
 * `{ title, description, image, siteName, url, type, oembedUrl }`
 * metadata extracted from Open Graph, Twitter Card, oEmbed discovery,
 * `<title>`, and `<meta name="description">` tags. Used by
 * link-aggregator (preview cards), blog (link blocks), and social
 * apps (post previews).
 *
 * Built-in safety:
 *
 * - SSRF guard refuses private/loopback/link-local hosts by default.
 * - The SSRF guard is DNS-aware: it resolves each host before fetching
 *   and rejects it if any A/AAAA record lands in a private/internal/
 *   metadata range, so a public hostname that resolves to a private
 *   address (DNS-rebinding / resolve-to-internal) is caught — not just
 *   IP/host literals. On the default fetch path the connection is pinned
 *   to the validated address (no check-then-connect rebind window); an
 *   injected `options.fetch` is still resolve-validated but owns its own
 *   transport, so for a hard guarantee there also restrict egress at the
 *   network layer.
 * - Manual redirect handling re-validates each hop.
 * - Hard timeout (default 5s) via `AbortController`.
 * - Body-size cap (default 1 MiB) — large pages are truncated.
 * - Content-type guard rejects non-HTML responses (PDF, images, JSON,
 *   …).
 * - Polite descriptive `User-Agent`.
 *
 * Pure HTTP fetch — no DOM, no headless browser. Works in any Node ≥
 * 20 runtime that ships `fetch`.
 *
 * @example
 * ```ts
 * import { getLinkPreview } from '@molecule/api-link-preview'
 *
 * const preview = await getLinkPreview('https://example.com/article')
 * // → { title, description, image, siteName, url, type, oembedUrl }
 * ```
 *
 * @example
 * ```ts
 * // With a @molecule/api-cache-compatible adapter:
 * const preview = await getLinkPreview(url, {
 *   cache: myCacheAdapter,
 *   cacheTtlMs: 600_000,
 *   timeoutMs: 3_000,
 * })
 * ```
 *
 * @remarks
 * Throws {@link LinkPreviewError} (`error.code` is one of
 * `invalid-url`, `private-network-blocked`, `unsupported-protocol`,
 * `http-error`, `unsupported-content-type`, `too-many-redirects`,
 * `timeout`, `fetch-failed`). Map `error.code` to translated user-facing
 * text in the calling handler — this utility intentionally has no
 * locale bond (handler-error pattern).
 *
 * Proxied egress: Node's built-in fetch ignores HTTP_PROXY/HTTPS_PROXY. In
 * proxy-only environments (e.g. molecule.dev sandboxes) pass a proxy-aware
 * implementation via `options.fetch`, or every preview fails with
 * `fetch-failed`. Remember the targets are arbitrary user-submitted hosts —
 * an egress allowlist and this package are natural partners.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './fetcher.js'
export * from './parse.js'
export * from './preview.js'
export * from './ssrf.js'
export * from './types.js'
