/**
 * LTX video generation provider configuration.
 *
 * @module
 */

/**
 * Configuration for the LTX video generation provider. Every field falls
 * back to its env var, read on each call (never at import time).
 */
export interface LtxVideoGenerationConfig {
  /** API key from the LTX developer console. Defaults to the `LTXV_API_KEY` env var (required). */
  apiKey?: string
  /** Base URL override. Defaults to `LTX_BASE_URL`, then `https://api.ltx.io`. */
  baseUrl?: string
  /** Default model id. Defaults to `LTX_MODEL`, then `ltx-2-5-fast`. */
  defaultModel?: string
  /** Per-request timeout in milliseconds. Defaults to 120000. */
  timeoutMs?: number
}
