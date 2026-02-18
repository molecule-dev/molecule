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

import type {
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
 * Converts a molecule `RequestConfig` to an Axios-compatible `AxiosRequestConfig`.
 * @param config - The molecule request configuration.
 * @returns An `AxiosRequestConfig` with mapped headers, params, timeout, and other options.
 */
function toAxiosConfig(config: RequestConfig): AxiosRequestConfig {
  return {
    headers: config.headers,
    params: config.params,
    timeout: config.timeout,
    withCredentials: config.withCredentials,
    responseType: config.responseType,
    signal: config.signal,
    ...config.options,
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
 * @param config - Axios client configuration (base URL, headers, timeout, credentials, or an existing Axios instance).
 * @returns An `HttpClient` backed by Axios with interceptor and auth token support.
 */
export function createAxiosClient(config: AxiosHttpClientConfig = {}): HttpClient {
  const {
    baseURL = '',
    defaultHeaders = {},
    timeout = 30000,
    withCredentials = false,
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
  const currentDefaultHeaders = { ...defaultHeaders }

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
    }

    // Run request interceptors
    for (const interceptor of requestInterceptors) {
      config = await interceptor(config)
    }

    // Apply back to Axios config
    axiosConfig.url = config.url
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
      )

      for (const interceptor of errorInterceptors) {
        try {
          const result = await interceptor(httpError)
          if (result) {
            return result
          }
        } catch {
          // Continue to next interceptor
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

      const response = await axiosInstance.request<T>(axiosConfig)
      return toHttpResponse(response, config)
    },

    async get<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
      const fullConfig: FullRequestConfig = {
        method: 'GET',
        url,
        ...config,
      }
      const response = await axiosInstance.get<T>(url, toAxiosConfig(config ?? {}))
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
      const response = await axiosInstance.post<T>(url, data, toAxiosConfig(config ?? {}))
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
      const response = await axiosInstance.put<T>(url, data, toAxiosConfig(config ?? {}))
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
      const response = await axiosInstance.patch<T>(url, data, toAxiosConfig(config ?? {}))
      return toHttpResponse(response, fullConfig)
    },

    async delete<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
      const fullConfig: FullRequestConfig = {
        method: 'DELETE',
        url,
        ...config,
      }
      const response = await axiosInstance.delete<T>(url, toAxiosConfig(config ?? {}))
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
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`
        currentDefaultHeaders['Authorization'] = `Bearer ${token}`
      } else {
        delete axiosInstance.defaults.headers.common['Authorization']
        delete currentDefaultHeaders['Authorization']
      }
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

/** Default Axios-based HTTP client created with default options (no base URL, 30s timeout). */
export const provider = createAxiosClient()
