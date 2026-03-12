/**
 * Default fetch-based HTTP client implementation.
 *
 * @module
 */

import type { HttpClient, HttpError, HttpRequestOptions, HttpResponse } from './types.js'

/**
 * Default HTTP client using the global fetch API.
 */
export const defaultClient: HttpClient = {
  async request<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    const method = options?.method ?? 'GET'

    // Prepend baseURL if provided
    let fullUrl = options?.baseURL ? options.baseURL + url : url

    // Append query params
    if (options?.params) {
      const params = Object.entries(options.params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')

      if (params) {
        fullUrl += fullUrl.includes('?') ? `&${params}` : `?${params}`
      }
    }

    // Prepare body
    let body: string | undefined
    const headers: Record<string, string> = { ...options?.headers }

    if (options?.body !== undefined) {
      if (typeof options.body === 'object' && options.body !== null) {
        body = JSON.stringify(options.body)
        headers['Content-Type'] = 'application/json'
      } else if (typeof options.body === 'string') {
        body = options.body
      }
    }

    // Enforce timeout via AbortController when options.timeout is set.
    // If the caller also passed a signal, abort on either timeout or caller abort.
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let signal = options?.signal
    if (options?.timeout && options.timeout > 0) {
      const controller = new AbortController()
      timeoutId = setTimeout(() => controller.abort(), options.timeout)
      // If the caller also provided a signal, abort our controller when it fires
      if (signal) {
        signal.addEventListener('abort', () => controller.abort(), { once: true })
      }
      signal = controller.signal
    }

    let response: Response
    try {
      // Make the fetch request
      response = await global.fetch(fullUrl, {
        method,
        headers,
        body,
        credentials: options?.credentials,
        signal,
      })
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
      // Tag timeout errors for callers to distinguish
      if (err instanceof Error && err.name === 'AbortError' && options?.timeout) {
        const timeoutErr = new Error(`Request timed out after ${options.timeout}ms`) as HttpError
        timeoutErr.isTimeout = true
        timeoutErr.request = { url: fullUrl }
        throw timeoutErr
      }
      throw err
    }
    if (timeoutId) clearTimeout(timeoutId)

    const { status, statusText } = response

    // Parse response data
    let data: T

    if (options?.responseType === 'text') {
      data = (await response.text()) as T
    } else if (status === 204 || response.headers.get('content-length') === '0') {
      data = null as T
    } else {
      try {
        data = (await response.json()) as T
      } catch {
        data = null as T
      }
    }

    // Convert Fetch Headers to plain object
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // Handle error responses
    if (!response.ok) {
      const error = new Error(`HTTP ${status}: ${statusText}`) as HttpError
      error.response = {
        status,
        statusText,
        headers: responseHeaders,
        data,
        request: { url: fullUrl },
      }
      error.request = { url: fullUrl }
      throw error
    }

    return {
      status,
      statusText,
      headers: responseHeaders,
      data,
      request: { url: fullUrl },
    }
  },

  async get<T = unknown>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return defaultClient.request<T>(url, { ...options, method: 'GET' })
  },

  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return defaultClient.request<T>(url, { ...options, method: 'POST', body })
  },

  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return defaultClient.request<T>(url, { ...options, method: 'PUT', body })
  },

  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return defaultClient.request<T>(url, { ...options, method: 'PATCH', body })
  },

  async delete<T = unknown>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method'>,
  ): Promise<HttpResponse<T>> {
    return defaultClient.request<T>(url, { ...options, method: 'DELETE' })
  },
}
