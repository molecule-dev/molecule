/**
 * Core type definitions for the HTTP client.
 *
 * @module
 */

import type { RetryOptions } from './retry.js'

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
   * recognizes a request the settle function issues while it runs and never holds it — this
   * package's client awaits the gate before anything else, so a `restoreSession()` that calls
   * it directly does not deadlock. But a restore that awaits something else first
   * (`await storage.get()`), then calls the client, reaches `awaitAuthGate` after that window:
   * the gate then waits on itself, and every request on the page stalls until the gate times
   * out (3 s) — so pass `skipAuthGate: true` on that request. A provider that awaits the gate
   * inside a scheduled interceptor (the Axios bond) also reaches it after the window, so its
   * restore's request needs the opt-out.
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

  /**
   * Retry policy for this request, or `false` to disable retries.
   *
   * The default policy retries only IDEMPOTENT requests (`GET`/`HEAD`/`PUT`/
   * `DELETE`/`OPTIONS`, and `POST`/`PATCH` carrying an `Idempotency-Key`) on
   * `502`/`503`/`504` or a reset/refused connection, twice, with exponential
   * backoff and jitter, honoring `Retry-After`. See `@molecule/app-http`'s
   * `shouldRetryRequest`.
   */
  retry?: RetryOptions | false
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
 *
 * **`status` is an HTTP status when the server answered, and `0` when it did not.**
 * A `0` means NO response exists: the request was aborted (an `AbortController`, a
 * component's effect cleanup, a route change tearing the request down) or the
 * network failed before anything came back. It is not an HTTP status at all, so it
 * says nothing about the session — an app must never treat `status < 500` as
 * "signed out", because every aborted request on a route change would clear the
 * session. The correct check is {@link isAuthFailure} (`status === 401 || status === 403`);
 * `isNoResponse` (`status === 0`) identifies this case.
 *
 * @example
 * ```typescript
 * try {
 *   await http.get('/projects')
 * } catch (err) {
 *   if (isAuthFailure(err)) clearSession()      // 401/403: the server rejected the credential
 *   else if (isNoResponse(err)) return           // aborted or offline — not a session decision
 *   else showError(err)
 * }
 * ```
 */
export class HttpError extends Error {
  /**
   * Builds a failed-request error.
   *
   * @param message - Human-readable message (already translated where a key exists).
   * @param status - HTTP status, or `0` when no response was received (aborted / network failure).
   * @param response - Parsed response when the server answered, otherwise undefined.
   * @param config - The request config that failed.
   * @param errorKey - Translation key for the failure (`http.error.aborted` for an
   *   aborted request, `http.error.networkError` for a real network failure).
   * @param aborted - Whether the request was aborted before a response: an
   *   `AbortController` signal (component cleanup, a cancelled request) or the
   *   browser tearing the fetch down during a navigation. Distinguishes an abort
   *   from a network outage on the same `status === 0`, without parsing the message.
   */
  constructor(
    message: string,
    public status: number,
    public response?: HttpResponse,
    public config?: FullRequestConfig,
    public errorKey?: string,
    public aborted = false,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
