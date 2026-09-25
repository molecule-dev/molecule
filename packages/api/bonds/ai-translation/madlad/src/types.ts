/**
 * MADLAD-400 translation provider configuration.
 *
 * @module
 */

/**
 * Configuration for the MADLAD-400 translation provider.
 */
export interface MadladConfig {
  /**
   * URL of a running MADLAD sidecar (`sidecar/server.py` in this package). Defaults to
   * `MADLAD_BASE_URL`, then `http://127.0.0.1:8765`.
   */
  baseUrl?: string
  /** Bearer token, if the sidecar was started with `MADLAD_API_KEY`. Defaults to that env var. */
  apiKey?: string
  /** Texts per HTTP request. Defaults to 32. */
  batchSize?: number
  /** Beam width: 1 is fastest; 2–4 is slower and sometimes better. Defaults to 1. */
  beamSize?: number
  /** Longest translation, in tokens. Defaults to 256. */
  maxLength?: number
  /** Request timeout in milliseconds. Defaults to 10 minutes (CPU translation is slow). */
  timeoutMs?: number
  /** Replaces `fetch` — for tests or a proxy-aware client. */
  fetch?: typeof fetch
}
