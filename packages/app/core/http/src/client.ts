/**
 * HTTP client interface definitions.
 *
 * Defines the contract that all HTTP client implementations must follow.
 *
 * @module
 */

import type { ErrorInterceptor, RequestInterceptor, ResponseInterceptor } from './interceptors.js'
import type { RetryOptions } from './retry.js'
import type { FullRequestConfig, HttpResponse, RequestConfig } from './types.js'

/**
 * HTTP client interface.
 *
 * All HTTP providers must implement this interface.
 */
export interface HttpClient {
  /**
   * Base URL for all requests.
   */
  baseURL: string

  /**
   * Default headers for all requests.
   */
  defaultHeaders: Record<string, string>

  /**
   * Makes a generic HTTP request. `data` is a field of THIS config object — the same body
   * `post(url, data, config)` takes as its second argument.
   */
  request<T = unknown>(config: FullRequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a GET request.
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a POST request. `data` is the request BODY, not a config object: the wire body is
   * `data` itself, so `post(url, { data: body })` sends `{"data":body}` — pass `body` directly.
   * A config (headers, params) is the THIRD argument.
   */
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a PUT request. `data` is the request BODY (second argument) — never `{ data: body }`,
   * which sends `{"data":body}`; a config is the THIRD argument.
   */
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a PATCH request. `data` is the request BODY (second argument) — never `{ data: body }`,
   * which sends `{"data":body}`; a config is the THIRD argument.
   */
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a DELETE request.
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Adds a request interceptor.
   * Returns a function to remove the interceptor.
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void

  /**
   * Adds a response interceptor.
   * Returns a function to remove the interceptor.
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void

  /**
   * Adds an error interceptor.
   * Returns a function to remove the interceptor.
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void

  /**
   * Sets the authorization token.
   */
  setAuthToken(token: string | null): void

  /**
   * Returns the current authorization token, or `null` if not set.
   */
  getAuthToken(): string | null

  /**
   * Registers a handler for authentication errors (401).
   *
   * @returns An unsubscribe function.
   */
  onAuthError(handler: () => void): () => void
}

/**
 * HTTP client configuration.
 */
export interface HttpClientConfig {
  /**
   * Base URL for all requests: a path (`/api`) or an absolute URL
   * (`https://api.example.com/api`). A request path that already starts with the base's
   * path (`/api/users`) is not prefixed again, and a URL with its own host (`https://…`,
   * `//cdn…`) is requested as written.
   */
  baseURL?: string

  /**
   * Default headers for all requests.
   */
  defaultHeaders?: Record<string, string>

  /**
   * Default timeout in milliseconds.
   */
  timeout?: number

  /**
   * Whether to include credentials by default.
   */
  withCredentials?: boolean

  /**
   * The scheme of the `Authorization` header the auth token is sent with:
   * `Bearer` (default), or what your API expects, e.g. `Token` for an API that
   * reads `Authorization: Token <jwt>`. It is an option of the client's
   * CONSTRUCTOR (`createFetchClient({ baseURL, authScheme: 'Token' })`, or the
   * bonded provider's `createAxiosClient({ … })`), never a property of the client
   * it returns.
   */
  authScheme?: string

  /**
   * Default retry policy for every request this client makes, or `false` to
   * disable retries. A request's own `retry` overrides it.
   */
  retry?: RetryOptions | false
}
