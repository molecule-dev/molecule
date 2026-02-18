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

    // Make the fetch request
    const response = await global.fetch(fullUrl, {
      method,
      headers,
      body,
      credentials: options?.credentials,
      signal: options?.signal,
    })

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

    // Handle error responses
    if (!response.ok) {
      const error = new Error(`HTTP ${status}: ${statusText}`) as HttpError
      error.response = { status, statusText, headers: {}, data, request: { url: fullUrl } }
      error.request = { url: fullUrl }
      throw error
    }

    return {
      status,
      statusText,
      headers: {},
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
