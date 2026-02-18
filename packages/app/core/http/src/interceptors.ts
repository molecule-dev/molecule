/**
 * HTTP interceptor type definitions.
 *
 * Interceptors allow modification of requests and responses
 * at various stages of the HTTP lifecycle.
 *
 * @module
 */

import type { FullRequestConfig, HttpError, HttpResponse } from './types.js'

/**
 * Intercepts outgoing requests to modify headers, URL, or body
 * before the request is sent.
 *
 * @param config - The full request configuration to transform.
 */
export type RequestInterceptor = (
  config: FullRequestConfig,
) => FullRequestConfig | Promise<FullRequestConfig>

/**
 * Intercepts incoming responses to transform data, check status,
 * or perform side effects before the response reaches the caller.
 */
export type ResponseInterceptor<T = unknown> = (
  response: HttpResponse<T>,
) => HttpResponse<T> | Promise<HttpResponse<T>>

/**
 * Intercepts HTTP errors to transform, retry, or rethrow them.
 * Throwing from this interceptor propagates the error to the caller.
 */
export type ErrorInterceptor = (error: HttpError) => HttpError | Promise<HttpError> | never
