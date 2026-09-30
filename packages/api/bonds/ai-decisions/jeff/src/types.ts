/**
 * Jeff decisions provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Jeff decisions provider.
 */
export interface JeffConfig {
  /** Base URL of the `jeff-serve` host. Defaults to `JEFF_URL`, then `http://localhost:8000`. */
  baseUrl?: string
  /** Bearer token, when the server sets `JEFF_API_KEY`. Defaults to the `JEFF_API_KEY` env var. */
  apiKey?: string
  /**
   * Extra request headers, resolved before each call and merged over the
   * defaults — for a host whose auth expires or is not a bearer token (a Cloud
   * Run ID token, Modal proxy auth). Pair with `@molecule/api-model-hosting`:
   * `headers: () => hosting.authHeaders(endpoint.id)`.
   */
  headers?: () => Record<string, string> | Promise<Record<string, string>>
  /**
   * Model id sent on every request. `jeff-serve` REQUIRES one and accepts only
   * `'jeff'`, `'jeff-latest'` or its own name (e.g. `'jeff-qwen3.5-0.8b'`) —
   * it answers with whichever checkpoint it loaded. Defaults to `'jeff-latest'`.
   */
  model?: string
  /**
   * Most `choice` options the loaded checkpoint answers (the server's `/health`
   * reports it as `max_options`). Defaults to 26 — the Jeff models released on
   * 2026-09-28. Raise it only for a checkpoint trained on more.
   */
  maxOptions?: number
}
