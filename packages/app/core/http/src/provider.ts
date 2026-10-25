/**
 * HTTP client provider implementations.
 *
 * Contains concrete implementations of the HttpClient interface.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'

import { awaitAuthGate } from './auth-gate.js'
import type { AuthTokenResolver, HttpClient, HttpClientConfig } from './client.js'
import type { ErrorInterceptor, RequestInterceptor, ResponseInterceptor } from './interceptors.js'
import { retryDelayMs, shouldRetryRequest } from './retry.js'
import type { FullRequestConfig, HttpResponse, RequestConfig } from './types.js'
import { HttpError } from './types.js'

/** Wait for a retry backoff. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** A response whose body is an HTML document, not JSON. */
const HTML_CONTENT_TYPE = /^text\/html\b/i

/** A URL that names its own host: a scheme (`https://`) or protocol-relative (`//cdn…`). */
const ABSOLUTE_URL = /^([a-z][a-z\d+\-.]*:)?\/\//i

/** The scheme and host of an absolute baseURL (`https://host:8443`); nothing for a path. */
const BASE_AUTHORITY = /^([a-z][a-z\d+\-.]*:)?\/\/[^/?#]*/i

/**
 * The URL a request goes to under the client's baseURL.
 *
 * A URL that names its own host is used as written. Callers (e.g.
 * `@molecule/app-billing-react` hooks) pass absolute `/api/...` paths whether or not a
 * baseURL is bonded, so a path that already starts with the baseURL's path — `/api/users`
 * under `/api` or under `https://host/api` — is the full path and is not prefixed a second
 * time. Any other URL is joined onto the baseURL with exactly one `/`, as Axios joins them.
 *
 * @param baseURL - The client's baseURL.
 * @param url - The request URL.
 * @returns The URL to fetch.
 */
function joinBaseURL(baseURL: string, url: string): string {
  if (!baseURL || ABSOLUTE_URL.test(url)) return url
  const base = baseURL.replace(/\/+$/, '')
  const authority = BASE_AUTHORITY.exec(base)?.[0] ?? ''
  const basePath = base.slice(authority.length)
  if (basePath && url.startsWith(basePath) && /^(?:$|[/?#])/.test(url.slice(basePath.length))) {
    return authority + url
  }
  return url ? `${base}/${url.replace(/^\/+/, '')}` : baseURL
}

/**
 * Creates a fetch-based HTTP client using the native Fetch API.
 *
 * Supports request/response/error interceptors, automatic JSON
 * serialization, auth token injection, timeout via AbortController,
 * and 401 error handler hooks.
 *
 * @param config - Client configuration including baseURL, default headers, timeout, and credentials.
 * @returns A fully configured `HttpClient` instance.
 */
export const createFetchClient = (config: HttpClientConfig = {}): HttpClient => {
  const logger = getLogger('http')
  let authToken: string | null = null
  // The app's live session token, installed by `setAuthTokenSource()` through `setClient()`.
  // It is read per request, never stored: a session adopted without an auth event
  // (`setSession`, the OAuth callback's `setAccessToken`) changes the token with no event and,
  // when the profile data is unchanged, no state notification either — a stored copy would keep
  // sending the previous account's bearer.
  let authTokenResolver: AuthTokenResolver | null = null
  const requestInterceptors: RequestInterceptor[] = []
  const responseInterceptors: ResponseInterceptor[] = []
  const errorInterceptors: ErrorInterceptor[] = []
  const authErrorHandlers = new Set<() => void>()

  /** The bearer this request carries: the resolver's answer, else the static token. */
  const resolveAuthToken = (): string | null =>
    authTokenResolver ? (authTokenResolver() ?? null) : authToken

  // Track whether the document is currently navigating / unloading.
  // Browser tears down in-flight fetch()es on navigation as
  // `TypeError: Failed to fetch`, which is indistinguishable from a
  // real outage at the catch site. The pagehide / beforeunload listeners
  // give us a hint we can use to demote the log severity in that case
  // without hiding genuine network failures.
  let navigationInProgress = false
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const markNav = (): void => {
      navigationInProgress = true
      // Auto-clear shortly after; if the navigation is real, the page
      // will unload and we won't see anything else from this client
      // anyway. If it's a same-page event, this lets us recover.
      setTimeout(() => {
        navigationInProgress = false
      }, 1000)
    }
    window.addEventListener('beforeunload', markNav)
    window.addEventListener('pagehide', markNav)
  }

  const client: HttpClient = {
    baseURL: config.baseURL || '',
    defaultHeaders: config.defaultHeaders || {},

    async request<T = unknown>(requestConfig: FullRequestConfig): Promise<HttpResponse<T>> {
      // Wait for the session restore before anything else: the interceptors below
      // read the auth token, and the request must not leave unauthenticated just
      // because a page effect ran before the restore settled (see auth-gate.ts).
      // The request config goes with it so a request the gate itself depends on can opt out
      // (`skipAuthGate`) and a stalled gate can name what it held.
      await awaitAuthGate(requestConfig)

      // Apply request interceptors
      let finalConfig = { ...requestConfig }
      for (const interceptor of requestInterceptors) {
        finalConfig = await interceptor(finalConfig)
      }

      // Build URL
      let url = joinBaseURL(client.baseURL, finalConfig.url)

      // Add query params
      if (finalConfig.params) {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(finalConfig.params)) {
          if (value !== undefined) {
            params.append(key, String(value))
          }
        }
        const queryString = params.toString()
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString
        }
      }

      // Build headers
      const headers: Record<string, string> = {
        ...client.defaultHeaders,
        ...finalConfig.headers,
      }

      // Add auth token. Resolved HERE, after the gate: the session this request belongs to is
      // the one the restore settled on, and it cannot have changed since a copy was taken.
      const token = resolveAuthToken()
      if (token) {
        headers['Authorization'] = `${config.authScheme ?? 'Bearer'} ${token}`
      }

      // Add content-type for JSON
      if (finalConfig.data && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }

      // Build fetch options
      const fetchOptions: RequestInit = {
        method: finalConfig.method,
        headers,
        credentials:
          (finalConfig.withCredentials ?? config.withCredentials) ? 'include' : 'same-origin',
        signal: finalConfig.signal,
      }

      // Add body
      if (finalConfig.data) {
        if (finalConfig.data instanceof FormData || finalConfig.data instanceof Blob) {
          fetchOptions.body = finalConfig.data as BodyInit
          // Remove Content-Type for FormData (browser sets it with boundary)
          if (finalConfig.data instanceof FormData) {
            delete headers['Content-Type']
          }
        } else {
          fetchOptions.body = JSON.stringify(finalConfig.data)
        }
      }

      // Create abort controller for timeout
      const timeout = finalConfig.timeout ?? config.timeout
      const retryOptions = finalConfig.retry ?? config.retry

      // Bounded retry of IDEMPOTENT requests only. A rolling deploy restarts
      // one instance at a time, so a 502/503/504 or a reset connection can
      // appear for a few seconds while the platform is healthy. A POST is
      // repeated only when it carries an Idempotency-Key — never blind.
      for (let attempt = 0; ; attempt++) {
        // A timeout signal belongs to ONE attempt: reusing an aborted
        // controller would abort every retry instantly.
        let timeoutId: ReturnType<typeof setTimeout> | undefined
        if (timeout && !finalConfig.signal) {
          const controller = new AbortController()
          fetchOptions.signal = controller.signal
          timeoutId = setTimeout(() => controller.abort(), timeout)
        }

        try {
          const fetchResponse = await fetch(url, fetchOptions)

          if (timeoutId) {
            clearTimeout(timeoutId)
          }

          // Parse response headers
          const responseHeaders: Record<string, string> = {}
          fetchResponse.headers.forEach((value, key) => {
            responseHeaders[key] = value
          })

          // Parse response body
          let data: T
          const responseType = finalConfig.responseType || 'json'

          switch (responseType) {
            case 'text':
              data = (await fetchResponse.text()) as T
              break
            case 'blob':
              data = (await fetchResponse.blob()) as T
              break
            case 'arraybuffer':
              data = (await fetchResponse.arrayBuffer()) as T
              break
            case 'json':
            default: {
              const text = await fetchResponse.text()
              try {
                data = text ? JSON.parse(text) : null
              } catch (_error) {
                // Safe to ignore: the raw text is already captured above and used
                // as the fallback value. Non-JSON responses (plain text, HTML errors)
                // are a known valid case for some APIs.
                //
                // A 2xx HTML DOCUMENT is not one of those cases: it is the app's page
                // server answering a request that expected JSON — the Vite dev server's
                // SPA fallback when a relative URL had no API baseURL. Resolving with the
                // HTML as `data` turns that into a `Cannot read properties of undefined`
                // crash far from the call (xr-molecule-flash-m126: 6.5 minutes and 22
                // probe scripts to discover `getClient().baseURL` was `''`).
                const contentType = fetchResponse.headers.get('content-type') ?? ''
                if (fetchResponse.ok && HTML_CONTENT_TYPE.test(contentType)) {
                  throw new HttpError(
                    `${finalConfig.method} ${url} answered ${contentType.split(';')[0]} instead of ` +
                      "JSON — the request reached the page server, not the API; check the client's " +
                      'baseURL (a relative path with no baseURL resolves against the page origin)',
                    fetchResponse.status,
                    {
                      data: text as T,
                      status: fetchResponse.status,
                      statusText: fetchResponse.statusText,
                      headers: responseHeaders,
                      config: finalConfig,
                    },
                    finalConfig,
                    'http.error.requestFailed',
                  )
                }
                logger.debug('Response is not JSON, using raw text', url)
                data = text as T
              }
              break
            }
          }

          let response: HttpResponse<T> = {
            data,
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            headers: responseHeaders,
            config: finalConfig,
          }

          // Handle error status codes
          if (!fetchResponse.ok) {
            logger.warn('HTTP error', finalConfig.method, url, fetchResponse.status)
            const error = new HttpError(
              t(
                'http.error.requestFailed',
                { status: fetchResponse.status },
                { defaultValue: `Request failed with status ${fetchResponse.status}` },
              ),
              fetchResponse.status,
              response,
              finalConfig,
              'http.error.requestFailed',
            )

            // Handle auth errors
            if (fetchResponse.status === 401) {
              authErrorHandlers.forEach((handler) => handler())
            }

            if (
              shouldRetryRequest({
                method: finalConfig.method,
                headers,
                status: fetchResponse.status,
                attempt,
                errorMessage: error.message,
                options: retryOptions,
              })
            ) {
              await sleep(
                retryDelayMs(
                  fetchResponse.headers.get('retry-after') ?? undefined,
                  attempt,
                  retryOptions,
                ),
              )
              continue
            }

            // Apply error interceptors
            let finalError = error
            for (const interceptor of errorInterceptors) {
              finalError = await interceptor(finalError)
            }

            throw finalError
          }

          // Apply response interceptors
          for (const interceptor of responseInterceptors) {
            response = (await interceptor(response)) as HttpResponse<T>
          }

          return response
        } catch (err) {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }

          if (err instanceof HttpError) {
            throw err
          }

          // Distinguish an explicit abort (AbortController, page unload
          // wired up via signal) and SPA navigation-induced cancellation
          // from a real network outage.
          //
          //  - AbortError → user-initiated cancel: silent
          //  - "TypeError: Failed to fetch" while the browser tab is
          //    hidden / unloading → SPA tore down a fetch as it left the
          //    page. Demote to warn so it stays visible in the console
          //    for debugging but doesn't fail strict console-error gates.
          //  - Anything else (including "Failed to fetch" while the tab
          //    is visible) → real outage: logger.error.
          //
          // Components that want zero navigation noise should still pass
          // an AbortSignal from their useEffect cleanup.
          const errMsg = err instanceof Error ? err.message : ''
          const errName = err instanceof Error ? err.name : ''
          const isAbort =
            errName === 'AbortError' ||
            (typeof DOMException !== 'undefined' &&
              err instanceof DOMException &&
              err.name === 'AbortError') ||
            /the user aborted a request/i.test(errMsg)

          const tabHidden =
            typeof document !== 'undefined' &&
            (document.visibilityState === 'hidden' || document.hidden === true)
          const isNavCancel =
            !isAbort &&
            errName === 'TypeError' &&
            /failed to fetch|network ?error|load failed/i.test(errMsg) &&
            (tabHidden || navigationInProgress)

          if (isAbort) {
            // silent — not interesting
          } else if (isNavCancel) {
            logger.warn('Network request cancelled by navigation', finalConfig.method, url)
          } else {
            logger.error('Network error', finalConfig.method, url, err)
          }
          // An abort and a navigation cancellation are the SAME fact to a caller —
          // the request was cancelled before any response — and neither is a network
          // outage. Flag it (`aborted`) and give it its own errorKey so app code does
          // not have to parse the message, and so a session-clearing check can tell
          // it apart from a real failure without treating `status === 0` as a 4xx.
          const aborted = isAbort || isNavCancel
          const error = new HttpError(
            err instanceof Error
              ? err.message
              : t(aborted ? 'http.error.aborted' : 'http.error.networkError', undefined, {
                  defaultValue: aborted ? 'Request aborted' : 'Network error',
                }),
            0,
            undefined,
            finalConfig,
            aborted ? 'http.error.aborted' : 'http.error.networkError',
            aborted,
          )

          if (
            shouldRetryRequest({
              method: finalConfig.method,
              headers,
              status: 0,
              attempt,
              errorMessage: errMsg,
              aborted,
              options: retryOptions,
            })
          ) {
            await sleep(retryDelayMs(undefined, attempt, retryOptions))
            continue
          }

          // Apply error interceptors
          let finalError = error
          for (const interceptor of errorInterceptors) {
            finalError = await interceptor(finalError)
          }

          throw finalError
        }
      }
    },

    get<T = unknown>(url: string, requestConfig?: RequestConfig): Promise<HttpResponse<T>> {
      return client.request<T>({ ...requestConfig, method: 'GET', url })
    },

    post<T = unknown>(
      url: string,
      data?: unknown,
      requestConfig?: RequestConfig,
    ): Promise<HttpResponse<T>> {
      return client.request<T>({ ...requestConfig, method: 'POST', url, data })
    },

    put<T = unknown>(
      url: string,
      data?: unknown,
      requestConfig?: RequestConfig,
    ): Promise<HttpResponse<T>> {
      return client.request<T>({ ...requestConfig, method: 'PUT', url, data })
    },

    patch<T = unknown>(
      url: string,
      data?: unknown,
      requestConfig?: RequestConfig,
    ): Promise<HttpResponse<T>> {
      return client.request<T>({ ...requestConfig, method: 'PATCH', url, data })
    },

    delete<T = unknown>(url: string, requestConfig?: RequestConfig): Promise<HttpResponse<T>> {
      return client.request<T>({ ...requestConfig, method: 'DELETE', url })
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
