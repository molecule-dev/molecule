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

/** Placeholder substituted for redacted secret-bearing request fields. */
const REDACTED = '[REDACTED]'

/**
 * Returns a shallow copy of request options with secret-bearing fields
 * redacted. The request `body` (which for an OAuth token exchange contains
 * `client_secret`/`code`/`refresh_token`) is replaced with a placeholder, and
 * any `authorization` header (Basic client_secret or Bearer access token) is
 * masked. This is applied before attaching the request to an `HttpError` so a
 * caught/logged error can never emit a credential to logs (CWE-532). The
 * success path (`toHttpResponse` from `client.request`) is unaffected, so
 * legitimate consumers of `response.request` still see the full options.
 *
 * @param requestOptions - The original request options.
 * @returns A redacted copy safe to attach to an error destined for logs.
 */
export const sanitizeRequestOptions = (
  requestOptions: HttpRequestOptions & { url: string },
): HttpRequestOptions & { url: string } => {
  const sanitized: HttpRequestOptions & { url: string } = { ...requestOptions }

  // The request body to a token endpoint can carry client_secret, code,
  // refresh_token, etc. Never retain it on an error destined for logs.
  if (sanitized.body !== undefined) {
    sanitized.body = REDACTED
  }

  // Authorization headers carry Basic (client_secret) or Bearer credentials.
  if (sanitized.headers) {
    const safeHeaders: Record<string, string> = {}
    for (const [key, value] of Object.entries(sanitized.headers)) {
      safeHeaders[key] = key.toLowerCase() === 'authorization' ? REDACTED : value
    }
    sanitized.headers = safeHeaders
  }

  return sanitized
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
  // Redact secrets from the request before attaching it: a thrown HttpError
  // routinely ends up in `logger.error(..., error)` / util.inspect output.
  const safeRequestOptions = sanitizeRequestOptions(requestOptions)

  const httpError = new Error(error.message) as HttpError
  httpError.request = safeRequestOptions
  httpError.code = error.code
  httpError.isAborted = error.code === 'ERR_CANCELED'
  httpError.isTimeout = error.code === 'ECONNABORTED'

  if (error.response) {
    httpError.response = toHttpResponse(error.response, safeRequestOptions)
  }

  return httpError
}
