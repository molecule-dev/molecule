/**
 * Type definitions for Axios HTTP provider.
 *
 * @module
 */

import type { AxiosInstance, AxiosRequestConfig } from 'axios'

// Re-export core types
export type {
  ErrorInterceptor,
  FullRequestConfig,
  HttpClient,
  HttpClientConfig,
  HttpMethod,
  HttpResponse,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from '@molecule/app-http'
export { HttpError } from '@molecule/app-http'

/**
 * Axios-specific configuration.
 */
export interface AxiosHttpClientConfig {
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

  /**
   * Existing Axios instance to wrap (optional).
   */
  instance?: AxiosInstance

  /**
   * Additional Axios-specific config.
   */
  axiosConfig?: AxiosRequestConfig
}
