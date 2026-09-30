/**
 * Laya decisions provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Laya decisions provider.
 */
export interface LayaConfig {
  /** Base URL of the `laya-serve` host. Defaults to `LAYA_URL`, then `http://localhost:8000`. */
  baseUrl?: string
  /** Bearer token, when the server sets `LAYA_API_KEY`. Defaults to the `LAYA_API_KEY` env var. */
  apiKey?: string
  /**
   * Extra request headers, resolved before each call and merged over the
   * defaults — for a host whose auth expires or is not a bearer token (a Cloud
   * Run ID token, Modal proxy auth). Pair with `@molecule/api-model-hosting`:
   * `headers: () => hosting.authHeaders(endpoint.id)`.
   */
  headers?: () => Record<string, string> | Promise<Record<string, string>>
  /**
   * Default checkpoint: `'english'`, `'multilingual'` or `'typed-decisions'`
   * (or a Hugging Face id such as `'convaiinnovations/laya-multilingual'`).
   * Omit to let the server route by the input's language.
   */
  model?: string
}
