/**
 * Core type definitions for the HTTP client.
 *
 * @module
 */

/**
 * HTTP request method.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * HTTP request options (headers, query params, timeout, credentials, response type, abort signal).
 */
export interface RequestConfig {
  /**
   * Request headers.
   */
  headers?: Record<string, string>

  /**
   * Query parameters.
   */
  params?: Record<string, string | number | boolean | undefined>

  /**
   * Request timeout in milliseconds.
   */
  timeout?: number

  /**
   * Whether to include credentials (cookies).
   */
  withCredentials?: boolean

  /**
   * Send this request WITHOUT waiting for the session restore (the auth gate).
   *
   * A request the gate's restore issues from a LATER continuation must set this. The gate
   * recognizes a request the settle function issues while it runs and never holds it — the
   * gated client awaits the gate before anything else, so a `restoreSession()` that calls it
   * directly does not deadlock. But a restore that awaits something else first
   * (`await storage.get()`), then calls the client, reaches `awaitAuthGate` after that window:
   * the gate then waits on itself, and every request on the page stalls until the gate times
   * out (3 s) — so pass `skipAuthGate: true` on that request:
   *
   * ```typescript
   * // the request the gate's restore makes, through the same client the gate holds back
   * await http.get(currentUserEndpoint, { skipAuthGate: true })
   * ```
   *
   * `@molecule/app-auth`'s own restore does not need it — it sends its request with
   * `fetch`, not through this client. An app with its own session store that registers a
   * gate with `setAuthGate` does not need it either when its restore calls the client
   * directly.
   */
  skipAuthGate?: boolean

  /**
   * Response type.
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'

  /**
   * Abort signal for cancellation.
   */
  signal?: AbortSignal

  /**
   * Request body data, as a field of THIS config object — the `request({ method, url, data })`
   * form. The verb methods take the body as their SECOND argument: `post(url, data, config)`,
   * `put(url, data, config)`, `patch(url, data, config)`. Never wrap it there as
   * `{ data: body }`: that object is the body, so the wire sends `{"data":body}` and the API
   * sees none of the fields at its top level.
   */
  data?: unknown

  /**
   * Custom request options (implementation-specific).
   */
  options?: Record<string, unknown>
}

/**
 * What the auth gate is told about the request it is about to hold: whether the request
 * opts out of the wait, and how to name it in the stalled-gate report.
 *
 * A request's own `RequestConfig` satisfies this — the providers pass it straight through
 * (`awaitAuthGate(requestConfig)`), so a provider never has to build one by hand.
 */
export interface AuthGateRequest {
  /**
   * Send this request without waiting for the gate at all — see
   * `RequestConfig.skipAuthGate`.
   */
  skipAuthGate?: boolean

  /**
   * The request's HTTP method, for the message logged when the gate never settles.
   */
  method?: string

  /**
   * The request's URL, for the message logged when the gate never settles. A URL may carry
   * an id; it never carries a credential (tokens travel in headers).
   */
  url?: string
}

/**
 * Full request configuration including method and URL.
 */
export interface FullRequestConfig extends RequestConfig {
  /**
   * HTTP method.
   */
  method: HttpMethod

  /**
   * Request URL (can be relative or absolute).
   */
  url: string

  /**
   * Request body data — a field of this config object, never a second argument here.
   */
  data?: unknown
}

/**
 * Parsed HTTP response with status code, headers, and typed body data.
 */
export interface HttpResponse<T = unknown> {
  /**
   * Response data.
   */
  data: T

  /**
   * HTTP status code.
   */
  status: number

  /**
   * HTTP status text.
   */
  statusText: string

  /**
   * Response headers.
   */
  headers: Record<string, string>

  /**
   * Original request config.
   */
  config: FullRequestConfig
}

/**
 * HTTP error with response details.
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: HttpResponse,
    public config?: FullRequestConfig,
    public errorKey?: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
