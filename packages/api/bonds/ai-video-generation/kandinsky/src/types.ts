/**
 * Kandinsky video generation provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Kandinsky video generation provider. Every field
 * falls back to its env var, read on each call (never at import time).
 */
export interface KandinskyVideoGenerationConfig {
  /** Server base URL without `/v1`. Defaults to the `KANDINSKY_BASE_URL` env var (required). */
  baseUrl?: string
  /** Optional API key, sent as `Authorization: Bearer …`. Defaults to `KANDINSKY_API_KEY`. */
  apiKey?: string
  /** Default model id. Defaults to `KANDINSKY_MODEL`, then the Lite distilled checkpoint. */
  defaultModel?: string
  /** Per-request timeout in milliseconds. Defaults to 300000 (a loaded GPU box responds slowly). */
  timeoutMs?: number
}
