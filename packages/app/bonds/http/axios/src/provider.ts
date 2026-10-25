/**
 * Axios HTTP client provider implementation.
 *
 * @module
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import { awaitAuthGate, retryDelayMs, shouldRetryRequest } from '@molecule/app-http'

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
 * Converts a molecule `RequestConfig` to an Axios-compatible `AxiosRequestConfig`.
 * @param config - The molecule request configuration.
 * @returns An `AxiosRequestConfig` with mapped headers, params, timeout, and other options.
 */
function toAxiosConfig(config: RequestConfig): AxiosRequestConfig & WithSkipAuthGate {
  return {
    headers: config.headers,
    params: config.params,
    timeout: config.timeout,
    withCredentials: config.withCredentials,
    responseType: config.responseType,
    signal: config.signal,
    data: config.data,
    ...config.options,
    // After `config.options`, so the documented option wins over an implementation-specific one.
    skipAuthGate: config.skipAuthGate,
  }
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
        return await run()
      } catch (error) {
        const httpError = error instanceof HttpError ? error : undefined
        const status = httpError?.status ?? (error as AxiosError).response?.status ?? 0
        const aborted = httpError?.aborted ?? (error as AxiosError).code === 'ERR_CANCELED'
        const retryAfter = httpError?.response?.headers['retry-after']
        const message = error instanceof Error ? error.message : String(error)
        if (
          shouldRetryRequest({
            method,
            headers: requestConfig?.headers ?? {},
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
    axiosConfig.headers.set(config.headers ?? {})
    axiosConfig.params = config.params
    axiosConfig.timeout = config.timeout
    axiosConfig.withCredentials = config.withCredentials
    axiosConfig.data = config.data

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
      const axiosConfig: AxiosRequestConfig = {
        method: config.method.toLowerCase(),
        url: config.url,
        data: config.data,
        ...toAxiosConfig(config),
      }

      const response = await withRetry(
        config.method,
        () => axiosInstance.request<T>(axiosConfig),
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
        () => axiosInstance.get<T>(url, toAxiosConfig(config ?? {})),
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
        () => axiosInstance.post<T>(url, data, toAxiosConfig(config ?? {})),
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
        () => axiosInstance.put<T>(url, data, toAxiosConfig(config ?? {})),
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
        () => axiosInstance.patch<T>(url, data, toAxiosConfig(config ?? {})),
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
        () => axiosInstance.delete<T>(url, toAxiosConfig(config ?? {})),
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
      authToken = token
      if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = `${authScheme} ${token}`
        currentDefaultHeaders['Authorization'] = `${authScheme} ${token}`
      } else {
        delete axiosInstance.defaults.headers.common['Authorization']
        delete currentDefaultHeaders['Authorization']
      }
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
