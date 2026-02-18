/**
 * Type definitions for Axios HTTP client provider.
 *
 * @module
 */

import type { AxiosInstance } from 'axios'

export type {
  ErrorInterceptor,
  HttpClient,
  HttpError,
  HttpRequestOptions,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
} from '@molecule/api-http'

import type { HttpRequestOptions } from '@molecule/api-http'

/**
 * Options for creating an Axios client.
 */
export interface AxiosClientOptions extends HttpRequestOptions {
  /**
   * Axios instance to use (if not provided, a new one is created).
   */
  instance?: AxiosInstance
}
