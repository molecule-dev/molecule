/**
 * Axios HTTP client implementation.
 *
 * @module
 */

import type { AxiosError } from 'axios'
import axios from 'axios'

export { axios }
import type {
  ErrorInterceptor,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
} from '@molecule/api-http'

import type { AxiosClientOptions } from './types.js'
import { toHttpError, toHttpResponse } from './utilities.js'

/**
 * Creates an Axios-backed HTTP client that implements the `HttpClient` interface.
 * Supports request/response/error interceptors and per-request configuration.
 *
 * @param options - Axios client options (baseURL, timeout, headers, or a pre-configured instance).
 * @returns An `HttpClient` backed by Axios.
 */
export const createClient = (options?: AxiosClientOptions): HttpClient => {
  const instance =
    options?.instance ??
    axios.create({
      baseURL: options?.baseURL,
      timeout: options?.timeout,
      headers: options?.headers,
    })

  const requestInterceptors: RequestInterceptor[] = []
  const responseInterceptors: ResponseInterceptor[] = []
  const errorInterceptors: ErrorInterceptor[] = []

  const client: HttpClient = {
    async request<T = unknown>(
      url: string,
      opts: HttpRequestOptions = {},
    ): Promise<HttpResponse<T>> {
      let requestOptions: HttpRequestOptions & { url: string } = { url, ...opts }

      // Apply request interceptors
      for (const interceptor of requestInterceptors) {
        requestOptions = await interceptor(requestOptions)
      }

      try {
        const response = await instance.request<T>({
          url: requestOptions.url,
          method: requestOptions.method ?? 'GET',
          headers: requestOptions.headers,
          data: requestOptions.body,
          params: requestOptions.params,
          timeout: requestOptions.timeout,
          baseURL: requestOptions.baseURL,
          signal: requestOptions.signal,
          responseType: requestOptions.responseType as
            | 'json'
            | 'text'
            | 'blob'
            | 'arraybuffer'
            | undefined,
          withCredentials: requestOptions.credentials === 'include',
        })

        let httpResponse = toHttpResponse<T>(response, requestOptions)

        // Apply response interceptors
        for (const interceptor of responseInterceptors) {
          httpResponse = (await interceptor(httpResponse)) as HttpResponse<T>
        }

        return httpResponse
      } catch (err) {
        let httpError = toHttpError(err as AxiosError, requestOptions)

        // Apply error interceptors
        for (const interceptor of errorInterceptors) {
          httpError = await interceptor(httpError)
        }

        throw httpError
      }
    },

    async get<T = unknown>(
      url: string,
      opts?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...opts, method: 'GET' })
    },

    async post<T = unknown>(
      url: string,
      body?: unknown,
      opts?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...opts, method: 'POST', body })
    },

    async put<T = unknown>(
      url: string,
      body?: unknown,
      opts?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...opts, method: 'PUT', body })
    },

    async patch<T = unknown>(
      url: string,
      body?: unknown,
      opts?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...opts, method: 'PATCH', body })
    },

    async delete<T = unknown>(
      url: string,
      opts?: Omit<HttpRequestOptions, 'method'>,
    ): Promise<HttpResponse<T>> {
      return client.request<T>(url, { ...opts, method: 'DELETE' })
    },

    create(defaults: HttpRequestOptions): HttpClient {
      return createClient({
        ...options,
        ...defaults,
      })
    },

    addRequestInterceptor(interceptor: RequestInterceptor): () => void {
      requestInterceptors.push(interceptor)
      return () => {
        const index = requestInterceptors.indexOf(interceptor)
        if (index > -1) requestInterceptors.splice(index, 1)
      }
    },

    addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
      responseInterceptors.push(interceptor)
      return () => {
        const index = responseInterceptors.indexOf(interceptor)
        if (index > -1) responseInterceptors.splice(index, 1)
      }
    },

    addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
      errorInterceptors.push(interceptor)
      return () => {
        const index = errorInterceptors.indexOf(interceptor)
        if (index > -1) errorInterceptors.splice(index, 1)
      }
    },
  }

  return client
}

/**
 * The default Axios HTTP client instance with default configuration.
 */
export const client: HttpClient = createClient()

/**
 * Alias for the client (for consistency with other providers).
 */
export const provider: HttpClient = client
