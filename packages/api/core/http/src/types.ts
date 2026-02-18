/**
 * Type definitions for HTTP client core interface.
 *
 * @module
 */

/**
 * HTTP request options.
 */
export interface HttpRequestOptions {
  /**
   * HTTP method.
   */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

  /**
   * Request headers.
   */
  headers?: Record<string, string>

  /**
   * Request body (will be JSON-stringified if object).
   */
  body?: unknown

  /**
   * Query parameters.
   */
  params?: Record<string, string | number | boolean | undefined>

  /**
   * Request timeout in milliseconds.
   */
  timeout?: number

  /**
   * Base URL to prepend to the request URL.
   */
  baseURL?: string

  /**
   * Whether to include credentials (cookies) in the request.
   */
  credentials?: 'omit' | 'same-origin' | 'include'

  /**
   * Response type.
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'

  /**
   * Signal for aborting the request.
   */
  signal?: AbortSignal

  /**
   * Custom options passed to the underlying client.
   */
  [key: string]: unknown
}

/**
 * HTTP response.
 */
export interface HttpResponse<T = unknown> {
  /**
   * Response status code.
   */
  status: number

  /**
   * Response status text.
   */
  statusText: string

  /**
   * Response headers.
   */
  headers: Record<string, string>

  /**
   * Response body.
   */
  data: T

  /**
   * Original request options.
   */
  request: HttpRequestOptions & { url: string }
}

/**
 * HTTP error.
 */
export interface HttpError extends Error {
  /**
   * Response (if available).
   */
  response?: HttpResponse

  /**
   * Request options.
   */
  request: HttpRequestOptions & { url: string }

  /**
   * Error code (e.g., 'ECONNREFUSED', 'ETIMEDOUT').
   */
  code?: string

  /**
   * Whether the request was aborted.
   */
  isAborted?: boolean

  /**
   * Whether the request timed out.
   */
  isTimeout?: boolean
}

/**
 * Function that transforms an outgoing HTTP request before it is sent (e.g. add auth headers).
 */
export type RequestInterceptor = (
  options: HttpRequestOptions & { url: string },
) => (HttpRequestOptions & { url: string }) | Promise<HttpRequestOptions & { url: string }>

/**
 * Function that transforms an incoming HTTP response before it is returned (e.g. unwrap data).
 * @param response - The response object.
 */
export type ResponseInterceptor<T = unknown> = (
  response: HttpResponse<T>,
) => HttpResponse<T> | Promise<HttpResponse<T>>

/**
 * Callback invoked when an HTTP request fails, allowing error
 * transformation or logging before re-throwing.
 */
export type ErrorInterceptor = (error: HttpError) => HttpError | Promise<HttpError>

/**
 * HTTP client interface that all HTTP bond packages must implement.
 *
 * Provides methods for each HTTP verb plus optional interceptors and
 * client factory support.
 */
export interface HttpClient {
  /**
   * Makes an HTTP request.
   */
  request<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>

  /**
   * Makes a GET request.
   */
  get<T = unknown>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>>

  /**
   * Makes a POST request.
   */
  post<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>>

  /**
   * Makes a PUT request.
   */
  put<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>>

  /**
   * Makes a PATCH request.
   */
  patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>>

  /**
   * Makes a DELETE request.
   */
  delete<T = unknown>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method'>,
  ): Promise<HttpResponse<T>>

  /**
   * Creates a new client with the given defaults.
   */
  create?(defaults: HttpRequestOptions): HttpClient

  /**
   * Adds a request interceptor.
   */
  addRequestInterceptor?(interceptor: RequestInterceptor): () => void

  /**
   * Adds a response interceptor.
   */
  addResponseInterceptor?(interceptor: ResponseInterceptor): () => void

  /**
   * Adds an error interceptor.
   */
  addErrorInterceptor?(interceptor: ErrorInterceptor): () => void
}
