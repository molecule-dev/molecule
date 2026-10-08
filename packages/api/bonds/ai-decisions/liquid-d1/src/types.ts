/**
 * Liquid d1 decisions provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Liquid d1 decisions provider.
 */
export interface LiquidD1Config {
  /**
   * Liquid API key (console.liquid.ai → Dashboard > API Keys; keys start with
   * `liquid_`). Defaults to the `LIQUID_API_KEY` env var. Required for the
   * hosted API; not needed when `decisionsUrl` points at your own keyless
   * `llama-server`.
   */
  apiKey?: string
  /**
   * Extra request headers, resolved before each request (retries included)
   * and merged over the defaults — for a host whose auth expires or is not a
   * bearer token (a Cloud Run ID token, Modal proxy auth). Pair with
   * `@molecule/api-model-hosting`: `headers: () => hosting.authHeaders(endpoint.id)`.
   */
  headers?: () => Record<string, string> | Promise<Record<string, string>>
  /**
   * Hosted API base URL. Defaults to `LIQUID_BASE_URL`, then
   * `https://api.liquid.ai`; the route `/decisions/v1/systemone` is appended.
   * Point it at a gateway that relays the Liquid decisions API.
   */
  baseUrl?: string
  /**
   * Base URL of a self-hosted server that serves the systemone route at
   * `/v1/systemone` — a `llama-server` running the open d1 weights
   * (`llama-server -hf LiquidAI/d1-3B-GGUF:Q8_0` → `http://127.0.0.1:8080`).
   * Defaults to the `LIQUID_DECISIONS_URL` env var. When set, no API key is
   * required (set `apiKey` only for an authenticating proxy in front of it).
   */
  decisionsUrl?: string
  /** Default model id: `'d1'` (text + images) or `'d1:free'` (text-only). Defaults to `'d1'`. */
  model?: string
}
