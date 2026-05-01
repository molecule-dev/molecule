/**
 * Normalized link-preview metadata returned by {@link getLinkPreview}.
 *
 * All fields are optional — fields that cannot be derived from the page
 * are left `undefined` rather than guessed. The `url` field is the final
 * resolved URL after redirects, which may differ from the input URL.
 */
export interface LinkPreview {
  /**
   * Page title — preferred order: `og:title`, `twitter:title`, `<title>`.
   */
  title?: string

  /**
   * Short description — preferred order: `og:description`,
   * `twitter:description`, `<meta name="description">`.
   */
  description?: string

  /**
   * Absolute image URL — preferred order: `og:image`, `og:image:url`,
   * `og:image:secure_url`, `twitter:image`, `twitter:image:src`. Relative
   * URLs in the source are resolved against the final page URL.
   */
  image?: string

  /**
   * Site or publication name — `og:site_name` falling back to the
   * hostname of the final URL.
   */
  siteName?: string

  /**
   * Final URL after any redirects. Always present in successful results.
   */
  url: string

  /**
   * Open Graph object type — e.g. `"website"`, `"article"`, `"video"`.
   * Falls back to `"website"` when not declared.
   */
  type?: string

  /**
   * oEmbed discovery endpoint detected via
   * `<link rel="alternate" type="application/json+oembed">`.
   * Consumers can fetch this separately for embed HTML; this package
   * does NOT follow the link automatically.
   */
  oembedUrl?: string
}

/**
 * Minimal cache contract — compatible with `@molecule/api-cache`
 * providers. Only `get`/`set` of string keys to JSON-serializable
 * values is required.
 */
export interface LinkPreviewCache {
  /**
   * Get a previously cached preview, or `undefined` if not present.
   */
  get(key: string): Promise<LinkPreview | undefined> | LinkPreview | undefined

  /**
   * Set a preview with an optional TTL in milliseconds.
   */
  set(key: string, value: LinkPreview, ttlMs?: number): Promise<void> | void
}

/**
 * Options for {@link getLinkPreview}.
 */
export interface GetLinkPreviewOptions {
  /**
   * Custom `fetch` implementation. Defaults to the global `fetch`.
   * Useful for tests, custom retry/timeout logic, or running behind an
   * HTTP proxy.
   */
  fetch?: typeof globalThis.fetch

  /**
   * `User-Agent` header sent with the request. Defaults to a polite
   * descriptive UA. Many sites return 403 for bare or empty UAs.
   */
  userAgent?: string

  /**
   * Request timeout in milliseconds. Defaults to 5_000 (5 seconds).
   * Implemented via `AbortController`.
   */
  timeoutMs?: number

  /**
   * Maximum body size in bytes that will be parsed. Defaults to
   * 1_048_576 (1 MiB). Bodies larger than this are truncated and parsed
   * as far as possible.
   */
  maxBodyBytes?: number

  /**
   * Maximum number of redirects to follow. Defaults to 5. Most consumer
   * sites use at most 1–2 hops.
   */
  maxRedirects?: number

  /**
   * Optional cache. When provided, successful previews are cached under
   * the input URL.
   */
  cache?: LinkPreviewCache

  /**
   * TTL in milliseconds for cached entries. Defaults to 600_000
   * (10 minutes). Only applied when {@link GetLinkPreviewOptions.cache}
   * is set.
   */
  cacheTtlMs?: number

  /**
   * SSRF guard — when `false` (the default) requests to private /
   * loopback / link-local IP ranges are refused. Set `true` to allow
   * them (for example in an internal-network scraper). Use with care.
   */
  allowPrivateNetworks?: boolean

  /**
   * Additional accepted content-type prefixes. By default only
   * `text/html` and `application/xhtml+xml` are parsed. Anything else
   * (PDF, image, audio, video, JSON …) is rejected with an error.
   */
  acceptedContentTypes?: string[]
}

/**
 * Error thrown when {@link getLinkPreview} cannot produce a preview.
 *
 * `code` is a stable machine-readable string; `message` is the
 * developer-facing English description (handler-error pattern — locale
 * bond not required for this utility).
 */
export class LinkPreviewError extends Error {
  /**
   * Stable machine-readable error code. Compare against
   * {@link LinkPreviewErrorCode} values.
   */
  public readonly code: LinkPreviewErrorCode

  /**
   * The URL that was being fetched when the error occurred.
   */
  public readonly url: string

  /**
   * Construct a new {@link LinkPreviewError}.
   *
   * @param code - Stable error code.
   * @param message - Developer-facing English description.
   * @param url - URL that was being fetched.
   */
  public constructor(code: LinkPreviewErrorCode, message: string, url: string) {
    super(message)
    this.name = 'LinkPreviewError'
    this.code = code
    this.url = url
  }
}

/**
 * Stable error codes emitted by {@link LinkPreviewError}.
 */
export type LinkPreviewErrorCode =
  | 'invalid-url'
  | 'private-network-blocked'
  | 'unsupported-protocol'
  | 'http-error'
  | 'unsupported-content-type'
  | 'too-many-redirects'
  | 'timeout'
  | 'fetch-failed'
