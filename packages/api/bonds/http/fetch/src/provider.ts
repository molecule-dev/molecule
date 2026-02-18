/**
 * Native fetch HTTP client provider.
 *
 * @module
 */

import type { HttpClient, HttpError, HttpRequestOptions, HttpResponse } from '@molecule/api-http'

/**
 * HTTP client using native fetch.
 */
export const fetchClient: HttpClient = {
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
    } = options

    let fullUrl = baseURL ? `${baseURL}${url}` : url
    if (params) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      }
      const queryString = searchParams.toString()
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: options.signal,
    }

    if (body !== undefined) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (timeout && !options.signal) {
      const controller = new AbortController()
      fetchOptions.signal = controller.signal
      timeoutId = setTimeout(() => controller.abort(), timeout)
    }

    try {
      const response = await fetch(fullUrl, fetchOptions)

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      let data: T
      if (responseType === 'json') {
        const text = await response.text()
        data = text ? JSON.parse(text) : null
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
        request: { url: fullUrl, ...options },
      }

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as HttpError
        error.response = httpResponse as HttpResponse
        error.request = { url: fullUrl, ...options }
        throw error
      }

      return httpResponse
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  },

  async get<T = unknown>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' })
  },

  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body })
  },

  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body })
  },

  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH', body })
  },

  async delete<T = unknown>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  },
}

/**
 * Default fetch-based HTTP provider.
 */
export const provider: HttpClient = fetchClient
