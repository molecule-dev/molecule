/**
 * Core type definitions for the HTTP client.
 *
 * @module
 */

/**
 * HTTP request method.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * HTTP request options (headers, query params, timeout, credentials, response type, abort signal).
 */
export interface RequestConfig {
  /**
   * Request headers.
   */
  headers?: Record<string, string>

  /**
   * Query parameters.
   */
  params?: Record<string, string | number | boolean | undefined>

  /**
   * Request timeout in milliseconds.
   */
  timeout?: number

  /**
   * Whether to include credentials (cookies).
   */
  withCredentials?: boolean

  /**
   * Response type.
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'

  /**
   * Abort signal for cancellation.
   */
  signal?: AbortSignal

  /**
   * Request body data.
   */
  data?: unknown

  /**
   * Custom request options (implementation-specific).
   */
  options?: Record<string, unknown>
}

/**
 * Full request configuration including method and URL.
 */
export interface FullRequestConfig extends RequestConfig {
  /**
   * HTTP method.
   */
  method: HttpMethod

  /**
   * Request URL (can be relative or absolute).
   */
  url: string

  /**
   * Request body data.
   */
  data?: unknown
}

/**
 * Parsed HTTP response with status code, headers, and typed body data.
 */
export interface HttpResponse<T = unknown> {
  /**
   * Response data.
   */
  data: T

  /**
   * HTTP status code.
   */
  status: number

  /**
   * HTTP status text.
   */
  statusText: string

  /**
   * Response headers.
   */
  headers: Record<string, string>

  /**
   * Original request config.
   */
  config: FullRequestConfig
}

/**
 * HTTP error with response details.
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: HttpResponse,
    public config?: FullRequestConfig,
    public errorKey?: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
