/**
 * Types for the oEmbed consumer.
 *
 * @module
 */

/**
 * Discriminator for {@link OEmbedResponse}. Per spec, the four valid
 * types are `photo`, `video`, `link`, and `rich`.
 */
export type OEmbedType = 'photo' | 'video' | 'link' | 'rich'

/**
 * Normalized oEmbed response. Mirrors the
 * [oEmbed 1.0 spec](https://oembed.com/) — all fields except `type`
 * and `version` are optional. The `html` field has been sanitized
 * before being placed on the result (no `<script>` tags or `on*`
 * attribute handlers).
 */
export interface OEmbedResponse {
  /**
   * Resource type — one of `photo`, `video`, `link`, `rich`.
   */
  type: OEmbedType

  /**
   * oEmbed format version. Always `"1.0"` for compliant providers.
   */
  version: string

  /**
   * Resource title.
   */
  title?: string

  /**
   * Author display name.
   */
  author_name?: string

  /**
   * Author homepage / profile URL.
   */
  author_url?: string

  /**
   * Provider display name (e.g. `"YouTube"`, `"Spotify"`).
   */
  provider_name?: string

  /**
   * Provider homepage URL.
   */
  provider_url?: string

  /**
   * Suggested cache duration in seconds.
   */
  cache_age?: number

  /**
   * Thumbnail image URL.
   */
  thumbnail_url?: string

  /**
   * Thumbnail width in pixels.
   */
  thumbnail_width?: number

  /**
   * Thumbnail height in pixels.
   */
  thumbnail_height?: number

  /**
   * Width of the embedded resource in pixels (`photo`, `video`, `rich`).
   */
  width?: number

  /**
   * Height of the embedded resource in pixels (`photo`, `video`, `rich`).
   */
  height?: number

  /**
   * Direct image URL (`photo` type only).
   */
  url?: string

  /**
   * Sanitized embed HTML (`video` and `rich` types). Never contains
   * `<script>` tags or `on*` event-handler attributes — see
   * {@link sanitizeHtml}.
   */
  html?: string

  /**
   * Provider-specific extensions. Keys outside the oEmbed spec are
   * preserved here so consumers can opt into them on a per-provider
   * basis.
   */
  [key: string]: unknown
}

/**
 * Minimal cache contract — compatible with `@molecule/api-cache`
 * providers. Only `get`/`set` of string keys to JSON-serializable
 * values is required.
 */
export interface OEmbedCache {
  /**
   * Get a previously cached response, or `undefined` if not present.
   */
  get(key: string): Promise<OEmbedResponse | undefined> | OEmbedResponse | undefined

  /**
   * Set a response with an optional TTL in milliseconds.
   */
  set(key: string, value: OEmbedResponse, ttlMs?: number): Promise<void> | void
}

/**
 * Map of provider URL patterns → oEmbed endpoints. Used as an
 * optimization to skip HTML discovery for popular providers (YouTube,
 * Twitter/X, Vimeo, Spotify, SoundCloud, Codepen).
 *
 * Each entry's `match` is tested against the input URL string with
 * `RegExp.test`. The first match wins. The `endpoint` URL has the
 * resource URL appended as a `url` query parameter, so it should NOT
 * include a trailing `?url=`.
 */
export interface OEmbedProvider {
  /**
   * Provider display name — e.g. `"YouTube"`.
   */
  name: string

  /**
   * Regex tested against the input URL. The first matching provider
   * wins, so order entries from most-specific to least-specific.
   */
  match: RegExp

  /**
   * Provider oEmbed endpoint URL — the input URL is appended as a
   * `url` query parameter at request time.
   */
  endpoint: string
}

/**
 * Options for {@link oembed}.
 */
export interface OEmbedOptions {
  /**
   * Custom `fetch` implementation. Defaults to the global `fetch`.
   * Useful for tests, custom retry/timeout logic, or running behind an
   * HTTP proxy.
   */
  fetch?: typeof globalThis.fetch

  /**
   * `User-Agent` header sent with the request. Defaults to a polite
   * descriptive UA.
   */
  userAgent?: string

  /**
   * Request timeout in milliseconds. Defaults to 5_000 (5 seconds).
   * Implemented via `AbortController`.
   */
  timeoutMs?: number

  /**
   * Maximum response body size in bytes that will be parsed. Defaults
   * to 262_144 (256 KiB). oEmbed JSON payloads are tiny in practice;
   * the cap keeps a hostile server from feeding us a 10 GB stream.
   */
  maxBodyBytes?: number

  /**
   * Maximum number of redirects to follow during discovery + fetch.
   * Defaults to 5.
   */
  maxRedirects?: number

  /**
   * Optional cache. When provided, successful responses are cached
   * under the input URL.
   */
  cache?: OEmbedCache

  /**
   * TTL in milliseconds for cached entries. Defaults to 600_000 (10
   * minutes). Only applied when {@link OEmbedOptions.cache} is set.
   */
  cacheTtlMs?: number

  /**
   * SSRF guard — when `false` (the default) requests to private /
   * loopback / link-local IP ranges are refused, including hosts that
   * resolve to such an address (DNS-aware). Set `true` to allow them
   * (for example in an internal-network embed scraper). Use with care.
   */
  allowPrivateNetworks?: boolean

  /**
   * Override or extend the built-in provider registry. Entries here
   * are tried BEFORE the built-ins, so callers can short-circuit a
   * built-in entry by registering an entry with an overlapping match.
   */
  providers?: OEmbedProvider[]

  /**
   * Optional `maxwidth` parameter forwarded to providers — most
   * providers honor this to scale embedded media.
   */
  maxWidth?: number

  /**
   * Optional `maxheight` parameter forwarded to providers.
   */
  maxHeight?: number
}

/**
 * Stable error codes emitted by {@link OEmbedError}.
 */
export type OEmbedErrorCode =
  | 'invalid-url'
  | 'private-network-blocked'
  | 'unsupported-protocol'
  | 'http-error'
  | 'unsupported-content-type'
  | 'too-many-redirects'
  | 'timeout'
  | 'fetch-failed'
  | 'no-oembed-endpoint'
  | 'invalid-oembed-payload'

/**
 * Error thrown when {@link oembed} cannot produce a normalized
 * response. `code` is a stable machine-readable string; `message` is
 * the developer-facing English description (handler-error pattern —
 * locale bond not required for this utility).
 */
export class OEmbedError extends Error {
  /**
   * Stable machine-readable error code. Compare against
   * {@link OEmbedErrorCode} values.
   */
  public readonly code: OEmbedErrorCode

  /**
   * The URL that was being processed when the error occurred.
   */
  public readonly url: string

  /**
   * Construct a new {@link OEmbedError}.
   *
   * @param code - Stable error code.
   * @param message - Developer-facing English description.
   * @param url - URL that was being processed.
   */
  public constructor(code: OEmbedErrorCode, message: string, url: string) {
    super(message)
    this.name = 'OEmbedError'
    this.code = code
    this.url = url
  }
}
