/**
 * HTTP client interface definitions.
 *
 * Defines the contract that all HTTP client implementations must follow.
 *
 * @module
 */

import type { ErrorInterceptor, RequestInterceptor, ResponseInterceptor } from './interceptors.js'
import type { FullRequestConfig, HttpResponse, RequestConfig } from './types.js'

/**
 * HTTP client interface.
 *
 * All HTTP providers must implement this interface.
 */
export interface HttpClient {
  /**
   * Base URL for all requests.
   */
  baseURL: string

  /**
   * Default headers for all requests.
   */
  defaultHeaders: Record<string, string>

  /**
   * Makes a generic HTTP request.
   */
  request<T = unknown>(config: FullRequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a GET request.
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a POST request.
   */
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a PUT request.
   */
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a PATCH request.
   */
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a DELETE request.
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Adds a request interceptor.
   * Returns a function to remove the interceptor.
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void

  /**
   * Adds a response interceptor.
   * Returns a function to remove the interceptor.
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void

  /**
   * Adds an error interceptor.
   * Returns a function to remove the interceptor.
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void

  /**
   * Sets the authorization token.
   */
  setAuthToken(token: string | null): void

  /**
   * Returns the current authorization token, or `null` if not set.
   */
  getAuthToken(): string | null

  /**
   * Registers a handler for authentication errors (401).
   *
   * @returns An unsubscribe function.
   */
  onAuthError(handler: () => void): () => void
}

/**
 * HTTP client configuration.
 */
export interface HttpClientConfig {
  /**
   * Base URL for all requests.
   */
  baseURL?: string

  /**
   * Default headers for all requests.
   */
  defaultHeaders?: Record<string, string>

  /**
   * Default timeout in milliseconds.
   */
  timeout?: number

  /**
   * Whether to include credentials by default.
   */
  withCredentials?: boolean
}
