/**
 * Utility functions for Axios operations.
 *
 * @module
 */

import type { AxiosError, AxiosResponse } from 'axios'

import type { HttpError, HttpRequestOptions, HttpResponse } from '@molecule/api-http'

/**
 * Converts axios response to HttpResponse.
 * @param response - The response object.
 * @param requestOptions - The request options.
 * @returns The transformed result.
 */
export const toHttpResponse = <T>(
  response: AxiosResponse<T>,
  requestOptions: HttpRequestOptions & { url: string },
): HttpResponse<T> => {
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(response.headers)) {
    if (typeof value === 'string') {
      headers[key] = value
    } else if (Array.isArray(value)) {
      headers[key] = value.join(', ')
    }
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    data: response.data,
    request: requestOptions,
  }
}

/**
 * Converts axios error to HttpError.
 * @param error - The error.
 * @param requestOptions - The request options.
 * @returns The transformed result.
 */
export const toHttpError = (
  error: AxiosError,
  requestOptions: HttpRequestOptions & { url: string },
): HttpError => {
  const httpError = new Error(error.message) as HttpError
  httpError.request = requestOptions
  httpError.code = error.code
  httpError.isAborted = error.code === 'ERR_CANCELED'
  httpError.isTimeout = error.code === 'ECONNABORTED'

  if (error.response) {
    httpError.response = toHttpResponse(error.response, requestOptions)
  }

  return httpError
}
