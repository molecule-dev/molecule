/**
 * HTTP client bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-http-axios`) call `setClient()` during setup.
 * If no bond is configured, a built-in fetch-based client is used as the default.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'

import { defaultClient } from './client.js'
import type { HttpClient, HttpRequestOptions, HttpResponse } from './types.js'

const BOND_TYPE = 'http-client'

/**
 * Registers an HTTP client as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param client - The HTTP client implementation to bond.
 */
export const setClient = (client: HttpClient): void => {
  bond(BOND_TYPE, client)
}

/**
 * Retrieves the bonded HTTP client. Falls back to the built-in
 * fetch-based client if no bond has been configured.
 *
 * @returns The bonded HTTP client, or the default fetch-based client.
 */
export const getClient = (): HttpClient => {
  return bondGet<HttpClient>(BOND_TYPE) ?? defaultClient
}

/**
 * Checks whether a custom HTTP client is currently bonded.
 *
 * @returns `true` if a custom HTTP client is bonded.
 */
export const hasClient = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Sends an HTTP request using the bonded (or default) client.
 *
 * @param url - The request URL.
 * @param options - Request options including method, headers, body, and query params.
 * @returns The HTTP response containing status, headers, and parsed body data.
 */
export const request = async <T = unknown>(
  url: string,
  options?: HttpRequestOptions,
): Promise<HttpResponse<T>> => {
  return getClient().request<T>(url, options)
}

/**
 * Sends an HTTP GET request using the bonded (or default) client.
 *
 * @param url - The request URL.
 * @param options - Request options (method and body are excluded).
 * @returns The HTTP response containing status, headers, and parsed body data.
 */
export const get = async <T = unknown>(
  url: string,
  options?: Omit<HttpRequestOptions, 'method' | 'body'>,
): Promise<HttpResponse<T>> => {
  return getClient().get<T>(url, options)
}

/**
 * Sends an HTTP POST request using the bonded (or default) client.
 *
 * @param url - The request URL.
 * @param body - The request body (objects are JSON-stringified automatically).
 * @param options - Request options (method and body are excluded).
 * @returns The HTTP response containing status, headers, and parsed body data.
 */
export const post = async <T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<HttpRequestOptions, 'method' | 'body'>,
): Promise<HttpResponse<T>> => {
  return getClient().post<T>(url, body, options)
}

/**
 * Sends an HTTP PUT request using the bonded (or default) client.
 *
 * @param url - The request URL.
 * @param body - The request body (objects are JSON-stringified automatically).
 * @param options - Request options (method and body are excluded).
 * @returns The HTTP response containing status, headers, and parsed body data.
 */
export const put = async <T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<HttpRequestOptions, 'method' | 'body'>,
): Promise<HttpResponse<T>> => {
  return getClient().put<T>(url, body, options)
}

/**
 * Sends an HTTP PATCH request using the bonded (or default) client.
 *
 * @param url - The request URL.
 * @param body - The request body (objects are JSON-stringified automatically).
 * @param options - Request options (method and body are excluded).
 * @returns The HTTP response containing status, headers, and parsed body data.
 */
export const patch = async <T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<HttpRequestOptions, 'method' | 'body'>,
): Promise<HttpResponse<T>> => {
  return getClient().patch<T>(url, body, options)
}

/**
 * Sends an HTTP DELETE request using the bonded (or default) client.
 *
 * @param url - The request URL.
 * @param options - Request options (method is excluded).
 * @returns The HTTP response containing status, headers, and parsed body data.
 */
export const del = async <T = unknown>(
  url: string,
  options?: Omit<HttpRequestOptions, 'method'>,
): Promise<HttpResponse<T>> => {
  return getClient().delete<T>(url, options)
}
