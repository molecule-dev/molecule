/**
 * Axios HTTP client provider implementation.
 *
 * @module
 */

import axios, {
  type AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import {
  awaitAuthGate,
  isIdempotentRequest,
  type KeepaliveReservation,
  reserveKeepalive,
  retryDelayMs,
  shouldRetryRequest,
  snapshotHttpErrorBody,
} from '@molecule/app-http'

import type {
  AuthTokenResolver,
  AxiosHttpClientConfig,
  ErrorInterceptor,
  FullRequestConfig,
  HttpClient,
  HttpResponse,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from './types.js'
import { HttpError } from './types.js'

/**
 * The molecule request option Axios itself does not know: `skipAuthGate`, set on
 * `client.get(url, { skipAuthGate: true })` and read by the request interceptor below. Axios
 * passes unknown config fields through untouched, which is what carries the option from
 * `toAxiosConfig` to the interceptor (`__tests__/skip-auth-gate.test.ts` proves it against a
 * real Axios instance).
 */
type WithSkipAuthGate = { skipAuthGate?: boolean }

/**
 * One attempt's keepalive decision: the caller's `keepalive` choice goes in, and the request
 * interceptor leaves the reservation it made for the attempt to release once it settles. A class
 * instance, because Axios's config merge copies a plain object and the interceptor would then write
 * to the copy.
 */
class KeepaliveAttempt {
  reservation?: KeepaliveReservation

  /**
   * Start an attempt's holder.
   *
   * @param choice - The caller's own `keepalive`, or undefined for the default.
   */
  constructor(readonly choice: boolean | undefined) {}
}

/** The per-attempt keepalive holder `toAxiosConfig` passes to the request interceptor. */
type WithKeepaliveAttempt = { moleculeKeepalive?: KeepaliveAttempt }

/**
 * Converts a molecule `RequestConfig` to an Axios-compatible `AxiosRequestConfig`.
 * @param config - The molecule request configuration.
 * @param keepalive - This attempt's keepalive holder.
 * @returns An `AxiosRequestConfig` with mapped headers, params, timeout, and other options.
 */
function toAxiosConfig(
  config: RequestConfig,
  keepalive?: KeepaliveAttempt,
): AxiosRequestConfig & WithSkipAuthGate & WithKeepaliveAttempt {
  return {
    headers: config.headers,
    params: config.params,
    timeout: config.timeout,
    withCredentials: config.withCredentials,
    responseType: config.responseType,
    signal: config.signal,
    data: config.data,
    ...config.options,
    // After `config.options`, so the documented options win over implementation-specific ones.
    skipAuthGate: config.skipAuthGate,
    moleculeKeepalive: keepalive,
  }
}

/**
 * The body Axios sends for `data`, as far as its size goes: Axios sends a plain object or array as
 * JSON. Anything else is returned as is, and `@molecule/app-http`'s `requestBodyBytes` sizes it or answers null (a form, a
 * stream, a class instance), which keeps the request off the keepalive default.
 *
 * @param data - The request data before Axios transforms it.
 * @returns The body to size.
 */
function sentBody(data: unknown): unknown {
  if (data === null || typeof data !== 'object') return data
  const prototype = Object.getPrototypeOf(data)
  if (!Array.isArray(data) && prototype !== Object.prototype && prototype !== null) return data
  try {
    return JSON.stringify(data)
  } catch (_error) {
    // Unserializable (a cycle, a BigInt): Axios will fail to send it too. The object itself sizes
    // as null, so the request is left off the keepalive default and fails as it would have.
    return data
  }
}

let fetchAdapterAvailable: boolean | undefined

/**
 * Whether this Axios has a usable fetch adapter (1.7+, with `fetch` in the environment).
 *
 * @returns True when a request can be sent through Axios's fetch adapter.
 */
function hasFetchAdapter(): boolean {
  if (fetchAdapterAvailable === undefined) {
    try {
      fetchAdapterAvailable =
        typeof axios.getAdapter === 'function' && typeof axios.getAdapter('fetch') === 'function'
    } catch (_error) {
      // getAdapter throws for an adapter this Axios or environment lacks; the answer is "no".
      fetchAdapterAvailable = false
    }
  }
  return fetchAdapterAvailable
}

/**
 * Whether the keepalive default may move a request to Axios's fetch adapter: the request uses one
 * of Axios's own adapters (a custom adapter function is the caller's transport and is kept), it
 * reports no upload progress (that needs a streamed body, which keepalive cannot send), and the
 * fetch adapter exists.
 *
 * @param axiosConfig - The request's merged Axios config.
 * @returns True when the default may apply.
 */
function keepaliveDefaultFits(axiosConfig: InternalAxiosRequestConfig): boolean {
  const adapter = axiosConfig.adapter
  const builtIn =
    adapter === undefined ||
    typeof adapter === 'string' ||
    (Array.isArray(adapter) && adapter.every((name) => typeof name === 'string'))
  return builtIn && !axiosConfig.onUploadProgress && hasFetchAdapter()
}

/**
 * Converts an `AxiosResponse` to the molecule `HttpResponse` interface. Normalizes
 * headers from `AxiosHeaders` to a plain `Record<string, string>`.
 * @param response - The raw Axios response.
 * @param config - The original molecule request config (preserved in the response for tracing).
 * @returns A normalized `HttpResponse` with data, status, headers, and config.
 */
function toHttpResponse<T>(response: AxiosResponse<T>, config: FullRequestConfig): HttpResponse<T> {
  const headers: Record<string, string> = {}

  // Convert AxiosHeaders to plain object
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value === 'string') {
        headers[key] = value
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ')
      }
    }
  }

  return {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers,
    config,
  }
}

/** A URL that names its own host: a scheme (`https://`) or protocol-relative (`//cdn…`). */
const ABSOLUTE_URL = /^([a-z][a-z\d+\-.]*:)?\/\//i

/** The scheme and host of an absolute base URL (`https://host:8443`); nothing for a path. */
const BASE_AUTHORITY = /^([a-z][a-z\d+\-.]*:)?\/\/[^/?#]*/i

/**
 * The base and URL to hand Axios for one request under the bonded base URL, so it requests
 * the URL `@molecule/app-http`'s fetch client requests.
 *
 * Axios joins `baseURL` to every URL that names no host, with one `/` between them, so
 * `get('/api/articles')` under `baseURL: '/api'` — or `'https://host/api'` — would request
 * `…/api/api/articles`. Callers legitimately pass the full path — the scaffolded app's own
 * examples call `/api/...` (a client bonded with the `/api` base must serve both
 * `get('/tags')` and `get('/api/tags')`) — so a path that already starts with the
 * base's path, in whole segments (`/api`, `/api/…`, `/api?…`, `/api#…`; never `/apiary`), is
 * requested as written: Axios gets it with only the base's scheme and host. Every other URL is
 * joined to the bonded base by Axios as usual, so a URL with its own host follows Axios's own
 * rules (`allowAbsoluteUrls` included).
 *
 * @param url - The URL the caller (or a request interceptor) supplied.
 * @param baseURL - The client's bonded base URL.
 * @returns The base and URL for Axios to join.
 */
function bondedRequest(url: string, baseURL: string): { baseURL: string; url: string } {
  const base = baseURL.replace(/\/+$/, '')
  const authority = BASE_AUTHORITY.exec(base)?.[0] ?? ''
  const basePath = base.slice(authority.length)
  const underBasePath =
    basePath !== '' &&
    !ABSOLUTE_URL.test(url) &&
    url.startsWith(basePath) &&
    /^(?:$|[/?#])/.test(url.slice(basePath.length))
  return underBasePath ? { baseURL: authority, url } : { baseURL, url }
}

/**
 * Creates an Axios-based HTTP client implementing the molecule `HttpClient` interface.
 * Supports request/response/error interceptors, auth token management, and 401 error handlers.
 *
 * @example
 * ```ts
 * import { createAxiosClient } from '@molecule/app-http-axios'
 * import { setClient } from '@molecule/app-http'
 *
 * const client = createAxiosClient({
 *   baseURL: 'https://api.example.com',
 *   timeout: 10000,
 * })
 *
 * setClient(client)
 * const response = await client.get('/users')
 * ```
 *
 * An API that reads another scheme than `Bearer` (`Authorization: Token <jwt>`) passes
 * `authScheme: 'Token'` HERE, in this constructor —
 * `setClient(createAxiosClient({ baseURL, authScheme: 'Token' }))` — and the auth token is
 * then sent with that scheme. It is the same option `@molecule/app-http`'s own client
 * takes, and not a property of the client you pass to `setClient()`.
 *
 * @param config - Axios client configuration (base URL, headers, timeout, credentials, auth scheme, or an existing Axios instance).
 * @returns An `HttpClient` backed by Axios with interceptor and auth token support.
 */
export function createAxiosClient(config: AxiosHttpClientConfig = {}): HttpClient {
  const {
    baseURL = '',
    defaultHeaders = {},
    timeout = 30000,
    withCredentials = false,
    authScheme = 'Bearer',
    instance: existingInstance,
    axiosConfig = {},
  } = config

  // Create or use existing Axios instance
  const axiosInstance: AxiosInstance =
    existingInstance ??
    axios.create({
      baseURL,
      timeout,
      withCredentials,
      headers: defaultHeaders,
      ...axiosConfig,
    })

  // Interceptor storage
  const requestInterceptors: RequestInterceptor[] = []
  const responseInterceptors: ResponseInterceptor[] = []
  const errorInterceptors: ErrorInterceptor[] = []
  const authErrorHandlers: Set<() => void> = new Set()

  let authToken: string | null = null
  // The app's live session token, installed by `setAuthTokenSource()` through `setClient()`.
  // Read per request in the interceptor below, never stored: a session adopted without an auth
  // event (`setSession`, an OAuth callback's `setAccessToken`) changes the token with no event
  // and, when the profile data is unchanged, no state notification either.
  let authTokenResolver: AuthTokenResolver | null = null
  const currentDefaultHeaders = { ...defaultHeaders }
  let managedDefaultToken: string | null = null

  /** The last spelling of each default wins, just as in Axios's native merge. */
  const headerValues = (headers: Record<string, string>): Map<string, string> =>
    new Map(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]))

  // axios.create already installed the constructor defaults. An existing instance has not.
  let appliedDefaultHeaders = existingInstance
    ? new Map<string, string>()
    : headerValues(defaultHeaders)

  /** Apply caller edits before Axios merges its defaults into the next attempt. */
  const syncDefaultHeaders = (): void => {
    const next = headerValues(client.defaultHeaders)
    const defaults = axiosInstance.defaults.headers
    for (const name of new Set([...appliedDefaultHeaders.keys(), ...next.keys()])) {
      if (appliedDefaultHeaders.get(name) === next.get(name)) continue
      for (const key of Object.keys(defaults)) {
        if (key.toLowerCase() === name) delete defaults[key]
      }
      if (next.has(name)) {
        Object.defineProperty(defaults, name, {
          value: next.get(name),
          enumerable: true,
          writable: true,
          configurable: true,
        })
      }
    }
    appliedDefaultHeaders = next
  }

  // HttpError intentionally omits request headers. Keep only these non-secret facts privately
  // so retry decisions still describe the request that actually reached the transport.
  const retryRequests = new WeakMap<
    object,
    {
      method: FullRequestConfig['method']
      hasIdempotencyKey: boolean
    }
  >()

  /** The bearer this request carries: the resolver's answer, else the static token. */
  const resolveAuthToken = (): string | null =>
    authTokenResolver ? (authTokenResolver() ?? null) : authToken

  /** Wait for a retry backoff. */
  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

  /**
   * Run one Axios call under the bounded retry policy.
   *
   * Only IDEMPOTENT requests are retried (a POST/PATCH joins them only when it
   * carries an `Idempotency-Key`), only on 502/503/504 or a reset/refused
   * connection, twice by default, honoring `Retry-After`. The policy itself
   * lives in `@molecule/app-http` so both transports agree.
   *
   * @param method - The request method.
   * @param run - One attempt.
   * @param requestConfig - The caller's config (headers + per-request policy).
   * @returns The successful Axios response.
   */
  const withRetry = async <T>(
    method: FullRequestConfig['method'],
    run: () => Promise<T>,
    requestConfig?: RequestConfig,
  ): Promise<T> => {
    const retryOptions = requestConfig?.retry ?? config.retry
    for (let attempt = 0; ; attempt++) {
      try {
        syncDefaultHeaders()
        return await run()
      } catch (error) {
        const httpError = error instanceof HttpError ? error : undefined
        const status = httpError?.status ?? (error as AxiosError).response?.status ?? 0
        const aborted = httpError?.aborted ?? (error as AxiosError).code === 'ERR_CANCELED'
        const retryAfter = httpError?.response?.headers['retry-after']
        const message = error instanceof Error ? error.message : String(error)
        const sent =
          error !== null && typeof error === 'object' ? retryRequests.get(error) : undefined
        if (
          shouldRetryRequest({
            method: sent?.method ?? method,
            headers: sent
              ? sent.hasIdempotencyKey
                ? { 'idempotency-key': 'present' }
                : {}
              : (requestConfig?.headers ?? {}),
            status,
            attempt,
            errorMessage: message,
            aborted,
            options: retryOptions,
          })
        ) {
          await sleep(retryDelayMs(retryAfter, attempt, retryOptions))
          continue
        }
        throw error
      }
    }
  }

  /**
   * One attempt, holding the keepalive budget the request interceptor reserved for it until the
   * attempt settles (each retry reserves its own).
   *
   * @param requestConfig - The caller's config.
   * @param run - Sends the attempt with its Axios config.
   * @returns The attempt's result.
   */
  const sendAttempt = async <R>(
    requestConfig: RequestConfig | undefined,
    run: (axiosConfig: AxiosRequestConfig) => Promise<R>,
  ): Promise<R> => {
    const keepalive = new KeepaliveAttempt(requestConfig?.keepalive)
    try {
      return await run(toAxiosConfig(requestConfig ?? {}, keepalive))
    } finally {
      keepalive.reservation?.release()
    }
  }

  // Add Axios request interceptor to run molecule interceptors
  axiosInstance.interceptors.request.use(async (axiosConfig: InternalAxiosRequestConfig) => {
    let config: FullRequestConfig = {
      method: (axiosConfig.method?.toUpperCase() as FullRequestConfig['method']) ?? 'GET',
      url: axiosConfig.url ?? '',
      headers: axiosConfig.headers as Record<string, string>,
      params: axiosConfig.params,
      timeout: axiosConfig.timeout,
      withCredentials: axiosConfig.withCredentials,
      data: axiosConfig.data,
      skipAuthGate: (axiosConfig as InternalAxiosRequestConfig & WithSkipAuthGate).skipAuthGate,
    }

    // Wait for the session restore first — every method on this client goes through
    // here, so a request fired by a page effect before the restore settled cannot
    // leave unauthenticated (see `@molecule/app-http` `auth-gate.ts`). The config goes with
    // it so a request the gate itself depends on can opt out (`skipAuthGate`) and a stalled
    // gate can name what it held.
    await awaitAuthGate(config)

    // Apply the live session token HERE, after the gate (the restore has settled) and BEFORE
    // the molecule interceptors, so one of them can still override the header in `config`.
    // Axios merged the instance defaults into `axiosConfig.headers` before this interceptor
    // ran, so a `setAuthToken` written during the request would only reach the NEXT request —
    // the header has to be set (or removed) on this request's own headers. Only the header
    // this client owns is replaced: none at all, or its static token (the instance's
    // `defaults.headers.common`). An `Authorization` passed per request or in `defaultHeaders`
    // keeps the precedence Axios gives it over that static token.
    if (authTokenResolver) {
      const sessionToken = authTokenResolver() ?? null
      const current = axiosConfig.headers.get('Authorization')
      if (current == null || current === axiosInstance.defaults.headers.common['Authorization']) {
        if (sessionToken) {
          axiosConfig.headers.set('Authorization', `${authScheme} ${sessionToken}`)
        } else {
          axiosConfig.headers.delete('Authorization')
        }
      }
    }

    // Run request interceptors
    for (const interceptor of requestInterceptors) {
      config = await interceptor(config)
    }

    // Apply back to Axios config. The bonded base is the base of every request, also on an
    // existing instance; a URL that already carries its path is requested as written — Axios
    // would otherwise prefix it a second time.
    if (baseURL) {
      const request = bondedRequest(config.url, baseURL)
      axiosConfig.baseURL = request.baseURL
      axiosConfig.url = request.url
    } else {
      axiosConfig.url = config.url
    }
    axiosConfig.method = config.method.toLowerCase()
    // A replacement header object is authoritative, including removals by an interceptor.
    axiosConfig.headers = AxiosHeaders.from(config.headers ?? {})
    axiosConfig.params = config.params
    axiosConfig.timeout = config.timeout
    axiosConfig.withCredentials = config.withCredentials
    axiosConfig.data = config.data

    // Decided last, on the request as it will be sent. XHR cannot outlive the page, so a write
    // that has to survive a navigation goes through Axios's fetch adapter with fetch's own
    // `keepalive` (see `@molecule/app-http` `reserveKeepalive` for which writes, and why).
    const keepalive = (axiosConfig as InternalAxiosRequestConfig & WithKeepaliveAttempt)
      .moleculeKeepalive
    if (keepalive) {
      keepalive.reservation?.release()
      const reservation = reserveKeepalive({
        method: config.method,
        url: axiosInstance.getUri(axiosConfig),
        body: sentBody(axiosConfig.data),
        keepalive: keepalive.choice ?? (keepaliveDefaultFits(axiosConfig) ? undefined : false),
      })
      keepalive.reservation = reservation
      if (reservation.keepalive) {
        axiosConfig.adapter = 'fetch'
        axiosConfig.fetchOptions = { ...axiosConfig.fetchOptions, keepalive: true }
        // XHR sends the page's own cookies whatever `withCredentials` says; Axios's fetch adapter
        // turns `false` into `credentials: 'omit'` and would drop them. Unset, it sends
        // `same-origin`, which is what XHR does.
        if (!axiosConfig.withCredentials) delete axiosConfig.withCredentials
      }
    }

    return axiosConfig
  })

  // Add Axios response interceptor to run molecule interceptors
  axiosInstance.interceptors.response.use(
    async (response: AxiosResponse) => {
      const moleculeConfig: FullRequestConfig = {
        method: (response.config.method?.toUpperCase() as FullRequestConfig['method']) ?? 'GET',
        url: response.config.url ?? '',
        headers: response.config.headers as Record<string, string>,
        data: response.config.data,
      }

      let httpResponse = toHttpResponse(response, moleculeConfig)

      // Run response interceptors
      for (const interceptor of responseInterceptors) {
        httpResponse = await interceptor(httpResponse)
      }

      // Update response data
      response.data = httpResponse.data

      return response
    },
    async (error: AxiosError) => {
      // Handle auth errors
      if (error.response?.status === 401) {
        authErrorHandlers.forEach((handler) => handler())
      }

      // A cancelled request (an AbortController signal) arrives with no response
      // and Axios' `ERR_CANCELED` code. Flag it like the fetch provider does, so a
      // caller can tell "aborted" from a real outage on the same `status === 0` and
      // never reads either as an auth failure.
      const aborted = error.code === 'ERR_CANCELED'

      if (error.response) error.response.data = await snapshotHttpErrorBody(error.response.data)

      // Run error interceptors
      const httpError = new HttpError(
        error.message,
        error.response?.status ?? 0,
        error.response
          ? toHttpResponse(error.response, {
              method: (error.config?.method?.toUpperCase() as FullRequestConfig['method']) ?? 'GET',
              url: error.config?.url ?? '',
              headers: error.config?.headers as Record<string, string>,
              data: error.config?.data,
            })
          : undefined,
        error.config
          ? {
              method: (error.config.method?.toUpperCase() as FullRequestConfig['method']) ?? 'GET',
              url: error.config.url ?? '',
              headers: error.config.headers as Record<string, string>,
              data: error.config.data,
            }
          : undefined,
        aborted ? 'http.error.aborted' : 'http.error.networkError',
        aborted,
      )
      if (error.config?.method) {
        retryRequests.set(httpError, {
          method: error.config.method.toUpperCase() as FullRequestConfig['method'],
          hasIdempotencyKey: isIdempotentRequest(
            'POST',
            (error.config.headers ?? {}) as Record<string, string>,
          ),
        })
      }

      for (const interceptor of errorInterceptors) {
        try {
          const result = await interceptor(httpError)
          if (result) {
            return result
          }
        } catch (_error) {
          // Intentional noop: an interceptor throwing must not abort the chain; the
          // original httpError is still rethrown below, so swallowing this is safe.
        }
      }

      throw httpError
    },
  )

  const client: HttpClient = {
    baseURL,
    defaultHeaders: currentDefaultHeaders,

    async request<T = unknown>(config: FullRequestConfig): Promise<HttpResponse<T>> {
      const response = await withRetry(
        config.method,
        () =>
          sendAttempt(config, (axiosConfig) =>
            axiosInstance.request<T>({
              method: config.method.toLowerCase(),
              url: config.url,
              ...axiosConfig,
            }),
          ),
        config,
      )
      return toHttpResponse(response, config)
    },

    async get<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
      const fullConfig: FullRequestConfig = {
        method: 'GET',
        url,
        ...config,
      }
      const response = await withRetry(
        'GET',
        () => sendAttempt(config, (axiosConfig) => axiosInstance.get<T>(url, axiosConfig)),
        config,
      )
      return toHttpResponse(response, fullConfig)
    },

    async post<T = unknown>(
      url: string,
      data?: unknown,
      config?: RequestConfig,
    ): Promise<HttpResponse<T>> {
      const fullConfig: FullRequestConfig = {
        method: 'POST',
        url,
        data,
        ...config,
      }
      const response = await withRetry(
        'POST',
        () => sendAttempt(config, (axiosConfig) => axiosInstance.post<T>(url, data, axiosConfig)),
        config,
      )
      return toHttpResponse(response, fullConfig)
    },

    async put<T = unknown>(
      url: string,
      data?: unknown,
      config?: RequestConfig,
    ): Promise<HttpResponse<T>> {
      const fullConfig: FullRequestConfig = {
        method: 'PUT',
        url,
        data,
        ...config,
      }
      const response = await withRetry(
        'PUT',
        () => sendAttempt(config, (axiosConfig) => axiosInstance.put<T>(url, data, axiosConfig)),
        config,
      )
      return toHttpResponse(response, fullConfig)
    },

    async patch<T = unknown>(
      url: string,
      data?: unknown,
      config?: RequestConfig,
    ): Promise<HttpResponse<T>> {
      const fullConfig: FullRequestConfig = {
        method: 'PATCH',
        url,
        data,
        ...config,
      }
      const response = await withRetry(
        'PATCH',
        () => sendAttempt(config, (axiosConfig) => axiosInstance.patch<T>(url, data, axiosConfig)),
        config,
      )
      return toHttpResponse(response, fullConfig)
    },

    async delete<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
      const fullConfig: FullRequestConfig = {
        method: 'DELETE',
        url,
        ...config,
      }
      const response = await withRetry(
        'DELETE',
        () => sendAttempt(config, (axiosConfig) => axiosInstance.delete<T>(url, axiosConfig)),
        config,
      )
      return toHttpResponse(response, fullConfig)
    },

    addRequestInterceptor(interceptor: RequestInterceptor): () => void {
      requestInterceptors.push(interceptor)
      return () => {
        const index = requestInterceptors.indexOf(interceptor)
        if (index !== -1) {
          requestInterceptors.splice(index, 1)
        }
      }
    },

    addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
      responseInterceptors.push(interceptor)
      return () => {
        const index = responseInterceptors.indexOf(interceptor)
        if (index !== -1) {
          responseInterceptors.splice(index, 1)
        }
      }
    },

    addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
      errorInterceptors.push(interceptor)
      return () => {
        const index = errorInterceptors.indexOf(interceptor)
        if (index !== -1) {
          errorInterceptors.splice(index, 1)
        }
      }
    },

    setAuthToken(token: string | null): void {
      syncDefaultHeaders()
      authToken = token
      if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = `${authScheme} ${token}`
      } else {
        delete axiosInstance.defaults.headers.common['Authorization']
      }

      // Mirror only our own token. Explicit caller defaults keep Axios's existing precedence.
      if (managedDefaultToken && client.defaultHeaders['Authorization'] === managedDefaultToken) {
        delete client.defaultHeaders['Authorization']
      }
      managedDefaultToken = null
      if (token && !headerValues(client.defaultHeaders).has('authorization')) {
        managedDefaultToken = `${authScheme} ${token}`
        client.defaultHeaders['Authorization'] = managedDefaultToken
      }
      // The mirror belongs in common, not at Axios's higher-priority top level.
      appliedDefaultHeaders = headerValues(client.defaultHeaders)
    },

    setAuthTokenResolver(resolver: AuthTokenResolver | null): void {
      authTokenResolver = resolver
    },

    getAuthToken(): string | null {
      return resolveAuthToken()
    },

    onAuthError(handler: () => void): () => void {
      authErrorHandlers.add(handler)
      return () => authErrorHandlers.delete(handler)
    },
  }

  return client
}

/** Default Axios-based HTTP client created with default options (no base URL, 30s timeout). */
export const provider = createAxiosClient()
