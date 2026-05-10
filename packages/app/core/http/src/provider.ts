/**
 * HTTP client provider implementations.
 *
 * Contains concrete implementations of the HttpClient interface.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'

import type { HttpClient, HttpClientConfig } from './client.js'
import type { ErrorInterceptor, RequestInterceptor, ResponseInterceptor } from './interceptors.js'
import type { FullRequestConfig, HttpResponse, RequestConfig } from './types.js'
import { HttpError } from './types.js'

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
  const requestInterceptors: RequestInterceptor[] = []
  const responseInterceptors: ResponseInterceptor[] = []
  const errorInterceptors: ErrorInterceptor[] = []
  const authErrorHandlers = new Set<() => void>()

  // Track whether the document is currently navigating / unloading.
  // Browser tears down in-flight fetch()es on navigation as
  // `TypeError: Failed to fetch`, which is indistinguishable from a
  // real outage at the catch site. The pagehide / beforeunload listeners
  // give us a hint we can use to demote the log severity in that case
  // without hiding genuine network failures.
  let navigationInProgress = false
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const markNav = () => {
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
      // Apply request interceptors
      let finalConfig = { ...requestConfig }
      for (const interceptor of requestInterceptors) {
        finalConfig = await interceptor(finalConfig)
      }

      // Build URL
      let url = finalConfig.url
      if (client.baseURL && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = client.baseURL + url
      }

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

      // Add auth token
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
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
      let timeoutId: ReturnType<typeof setTimeout> | undefined
      const timeout = finalConfig.timeout ?? config.timeout
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
            } catch {
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
        const error = new HttpError(
          err instanceof Error
            ? err.message
            : t('http.error.networkError', undefined, { defaultValue: 'Network error' }),
          0,
          undefined,
          finalConfig,
          'http.error.networkError',
        )

        // Apply error interceptors
        let finalError = error
        for (const interceptor of errorInterceptors) {
          finalError = await interceptor(finalError)
        }

        throw finalError
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

    getAuthToken(): string | null {
      return authToken
    },

    onAuthError(handler: () => void): () => void {
      authErrorHandlers.add(handler)
      return () => authErrorHandlers.delete(handler)
    },
  }

  return client
}
