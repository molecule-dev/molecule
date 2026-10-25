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
 * A live access-token resolver: called once per request, it returns the token the session
 * holds NOW (`null`/`undefined` when the session carries no body token — a cookie-session API).
 *
 * `@molecule/app-http`'s `setAuthTokenSource()` installs one on every client it bonds, so the
 * app's auth bond decides the bearer and the client resolves it per request instead of holding
 * a copy that a session adopted mid-page can leave stale.
 */
export type AuthTokenResolver = () => string | null | undefined

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
   *
   * A static token: every request carries it until the next `setAuthToken` call. A client
   * that has a {@link HttpClient.setAuthTokenResolver | resolver} (registered through
   * `@molecule/app-http`'s `setAuthTokenSource`) ignores this value when it assembles a
   * request — the resolver IS the session, and reading it per request is what keeps a
   * session adopted without an auth event from sending the previous account's bearer. Once
   * the resolver is removed, the static token is sent again.
   */
  setAuthToken(token: string | null): void

  /**
   * Returns the token the client applies to its next request: the resolver's answer when one
   * is registered, else the static token from `setAuthToken`.
   */
  getAuthToken(): string | null

  /**
   * Registers the LIVE token resolver every request of this client reads, or clears it with
   * `null`.
   *
   * `@molecule/app-http`'s `setAuthTokenSource()` calls this on every client it bonds, and the
   * client MUST consult the resolver again each time it assembles a request (and report it from
   * `getAuthToken()`). A session can change with no auth event and no observable state change —
   * `authClient.setSession()` with the same profile data, or the OAuth callback's
   * `setAccessToken()` — so a token pushed only at bond time or on `login`/`logout` events
   * leaves every later request carrying the PREVIOUS session's bearer while the UI shows the
   * new one.
   *
   * The resolved token takes the static token's place, with the same precedence: an
   * `Authorization` header passed per request or in the client's default headers wins over it
   * exactly where it won over a static token in this transport.
   *
   * A resolver that returns `null` (or `undefined`) means "this session has no body token": the
   * request carries no `Authorization` header of the client's own. A cookie-session API issues
   * no bearer, and the server prefers the header over the fresh cookie, so a kept bearer
   * authenticates as the prior — possibly deleted — session.
   *
   * Optional, so an implementation written against the previous interface still conforms.
   * `setAuthTokenSource()` follows such a client through a request interceptor instead, pushing
   * the source with `setAuthToken` before each request: that request carries the change only
   * when the transport applies its token after running its interceptors, so a transport that
   * applies it earlier sends a session adopted mid-page from the following request on.
   *
   * @param resolver - Returns the current access token (or null/undefined), or `null` to clear.
   */
  setAuthTokenResolver?(resolver: AuthTokenResolver | null): void

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
