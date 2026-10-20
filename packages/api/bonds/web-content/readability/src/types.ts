/**
 * Configuration for the Readability web content provider.
 *
 * @module
 */

/** Options for `createProvider()`. */
export interface ReadabilityWebContentConfig {
  /**
   * Per-fetch timeout in milliseconds (`fetch` only; `extract` never touches
   * the network). Defaults to `30_000`.
   */
  timeoutMs?: number

  /**
   * Largest response body a fetch reads, in bytes. Defaults to 3 MB — a
   * bigger body is refused rather than read into memory. `extract` is bounded
   * by the caller's own HTML size instead.
   */
  maxFetchBytes?: number

  /**
   * The `User-Agent` sent on fetches. Defaults to
   * `molecule-web-content/1.0 (+https://www.molecule.dev)` — an honest
   * product string, not a browser disguise.
   */
  userAgent?: string
}
