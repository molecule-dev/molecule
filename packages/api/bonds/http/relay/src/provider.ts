/**
 * `@molecule/api-http` client that sends every request through the egress relay.
 *
 * @module
 */

import type { HttpClient, HttpError, HttpRequestOptions, HttpResponse } from '@molecule/api-http'

import { RelayError } from './errors.js'
import { createRelayFetch } from './relay-fetch.js'
import type { RelayOptions } from './types.js'

/**
 * Whether a body is already a fetch body (sent as-is, not JSON-stringified).
 *
 * @param body - The request body.
 * @returns `true` for binary, form, blob and search-params bodies.
 */
function isRawBody(body: unknown): body is BodyInit {
  return (
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    body instanceof URLSearchParams
  )
}

/**
 * Append query parameters to a URL.
 *
 * @param url - The URL so far.
 * @param params - Parameters (undefined values skipped).
 * @returns The URL with a query string.
 */
function withParams(url: string, params: HttpRequestOptions['params']): string {
  if (!params) return url
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.append(key, String(value))
  }
  const query = search.toString()
  return query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url
}

/**
 * Create an `HttpClient` that relays every request.
 *
 * @param relayOptions - Relay URL, credential, underlying fetch, redirect limit. Unset values
 *   come from `MOLECULE_EGRESS_RELAY_URL` / `MOLECULE_EGRESS_CREDENTIAL` at request time.
 * @returns The client.
 */
export function createRelayClient(relayOptions: RelayOptions = {}): HttpClient {
  const client: HttpClient = {
    async request<T = unknown>(
      url: string,
      options: HttpRequestOptions = {},
    ): Promise<HttpResponse<T>> {
      const {
        method = 'GET',
        headers = {},
        body,
        params,
        timeout,
        baseURL,
        responseType = 'json',
        signal,
      } = options
      const redirect: RequestRedirect =
        options.redirect === 'manual' || options.redirect === 'error' ? options.redirect : 'follow'
      const fullUrl = withParams(baseURL ? `${baseURL}${url}` : url, params)
      const requestInfo = { ...options, url: fullUrl }

      const outgoing = new Headers()
      let payload: BodyInit | undefined
      if (body !== undefined && body !== null) {
        if (isRawBody(body)) {
          payload = body
        } else {
          payload = typeof body === 'string' ? body : JSON.stringify(body)
          outgoing.set('content-type', 'application/json')
        }
      }
      for (const [name, value] of Object.entries(headers)) outgoing.set(name, value)

      const controller = new AbortController()
      let timedOut = false
      const onAbort = (): void => controller.abort(signal?.reason)
      if (signal?.aborted) controller.abort(signal.reason)
      else signal?.addEventListener('abort', onAbort, { once: true })
      const timer = timeout
        ? setTimeout(() => {
            timedOut = true
            controller.abort()
          }, timeout)
        : undefined

      try {
        const response = await createRelayFetch(relayOptions)(fullUrl, {
          method,
          headers: outgoing,
          body: payload,
          signal: controller.signal,
          redirect,
        })
        const responseHeaders: Record<string, string> = {}
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value
        })
        let data: T
        if (responseType === 'json') {
          const text = await response.text()
          try {
            data = text ? (JSON.parse(text) as T) : (null as T)
          } catch (_error) {
            // Intentionally ignored: the core contract says a non-JSON body reads as null
            // (callers wanting the raw text pass responseType: 'text').
            data = null as T
          }
        } else if (responseType === 'text') {
          data = (await response.text()) as T
        } else if (responseType === 'blob') {
          data = (await response.blob()) as T
        } else {
          data = (await response.arrayBuffer()) as T
        }
        const httpResponse: HttpResponse<T> = {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          data,
          request: requestInfo,
        }
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as HttpError
          error.response = httpResponse as HttpResponse
          error.request = requestInfo
          throw error
        }
        return httpResponse
      } catch (error) {
        if (error instanceof RelayError) {
          error.request = requestInfo
          throw error
        }
        if (controller.signal.aborted && !(error as HttpError).request) {
          const aborted = new Error(
            timedOut ? `Request timed out after ${timeout}ms` : 'Request aborted',
            { cause: error },
          ) as HttpError
          aborted.request = requestInfo
          aborted.isAborted = true
          aborted.isTimeout = timedOut
          aborted.code = timedOut ? 'ETIMEDOUT' : 'ABORT_ERR'
          throw aborted
        }
        throw error
      } finally {
        if (timer) clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
      }
    },

    async get<T = unknown>(
      url: string,
      options?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...options, method: 'GET' })
    },

    async post<T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...options, method: 'POST', body })
    },

    async put<T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...options, method: 'PUT', body })
    },

    async patch<T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...options, method: 'PATCH', body })
    },

    async delete<T = unknown>(
      url: string,
      options?: Omit<HttpRequestOptions, 'method'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...options, method: 'DELETE' })
    },
  }
  return client
}

/**
 * The relay client, configured from `MOLECULE_EGRESS_RELAY_URL` and
 * `MOLECULE_EGRESS_CREDENTIAL` at request time.
 */
export const relayClient: HttpClient = createRelayClient()

/**
 * Default relay HTTP provider: `setClient(provider)` from `@molecule/api-http`.
 */
export const provider: HttpClient = relayClient
