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
   * The scheme of the `Authorization` header the auth token is sent with:
   * `Bearer` (default), or what your API expects, e.g. `Token` for an API that
   * reads `Authorization: Token <jwt>`. Pass it to this config, at construction —
   * `setClient(createAxiosClient({ baseURL, authScheme: 'Token' }))` — never as a
   * property of the client it returns. Same option as `@molecule/app-http`'s
   * `HttpClientConfig.authScheme`, so the config reads the same whichever
   * transport is bonded.
   */
  authScheme?: string

  /**
   * Existing Axios instance to wrap (optional).
   */
  instance?: AxiosInstance

  /**
   * Additional Axios-specific config.
   */
  axiosConfig?: AxiosRequestConfig
}
