/**
 * Kev decisions provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Kev decisions provider.
 */
export interface KevConfig {
  /** Base URL of the `kev.serve` host. Defaults to `KEV_URL`, then `http://localhost:8008`. */
  baseUrl?: string
  /** Bearer token, when the server sets `KEV_API_KEY`. Defaults to the `KEV_API_KEY` env var. */
  apiKey?: string
  /**
   * Extra request headers, resolved before each call and merged over the
   * defaults — for a host whose auth expires or is not a bearer token (a Cloud
   * Run ID token, Modal proxy auth). Pair with `@molecule/api-model-hosting`:
   * `headers: () => hosting.authHeaders(endpoint.id)`.
   */
  headers?: () => Record<string, string> | Promise<Record<string, string>>
  /**
   * Model id sent on every request. `kev.serve` accepts any string and echoes
   * it back; it never selects a checkpoint (the server answers with the one
   * it loaded via `--run`). Defaults to `'kev-latest'`.
   */
  model?: string
  /**
   * Most `choice` options / `score` levels sent in one question. Defaults to
   * 255, `kev.serve`'s own limit. Lower it for another `/v1/systemone` server
   * with a smaller one (Nimble: 26).
   */
  maxOptions?: number
  /**
   * Milliseconds to wait for one `decide()` (retries included) before
   * aborting. Defaults to 120000 — long enough for a scale-to-zero host's
   * cold start (~35 s on Modal) plus the model load.
   */
  timeoutMs?: number
}
