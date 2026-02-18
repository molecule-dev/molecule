/**
 * HTTP bond accessor and convenience request functions.
 *
 * If no custom client is bonded, a fetch-based client is auto-created
 * on first access. Provides `get`, `post`, `put`, `patch`, and `del`
 * shorthand functions that delegate to the bonded client.
 *
 * @module
 */

import { bond, get as bondGet } from '@molecule/app-bond'

import type { HttpClient } from './client.js'
import { createFetchClient } from './provider.js'
import type { HttpResponse, RequestConfig } from './types.js'

const BOND_TYPE = 'http-client'

/**
 * Registers an HTTP client as the active singleton.
 *
 * @param client - The HTTP client implementation to bond.
 *
 * @example
 * ```typescript
 * import { setClient, createFetchClient } from '@molecule/app-http'
 * setClient(createFetchClient({ baseURL: 'https://api.example.com' }))
 * ```
 */
export const setClient = (client: HttpClient): void => {
  bond(BOND_TYPE, client)
}

/**
 * Retrieves the bonded HTTP client. If none is bonded, automatically
 * creates a default fetch-based client.
 *
 * @returns The active HTTP client instance.
 */
export const getClient = (): HttpClient => {
  const existing = bondGet<HttpClient>(BOND_TYPE)
  if (existing) return existing
  const fallback = createFetchClient()
  bond(BOND_TYPE, fallback)
  return fallback
}

/**
 * Makes a GET request using the bonded HTTP client.
 *
 * @param url - The request URL (relative to baseURL if configured).
 * @param config - Optional request configuration (headers, params, timeout).
 * @returns The HTTP response with typed data.
 */
export const get = <T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> =>
  getClient().get<T>(url, config)

/**
 * Makes a POST request using the bonded HTTP client.
 *
 * @param url - The request URL.
 * @param data - The request body.
 * @param config - Optional request configuration.
 * @returns The HTTP response with typed data.
 */
export const post = <T = unknown>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<HttpResponse<T>> => getClient().post<T>(url, data, config)

/**
 * Makes a PUT request using the bonded HTTP client.
 *
 * @param url - The request URL.
 * @param data - The request body.
 * @param config - Optional request configuration.
 * @returns The HTTP response with typed data.
 */
export const put = <T = unknown>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<HttpResponse<T>> => getClient().put<T>(url, data, config)

/**
 * Makes a PATCH request using the bonded HTTP client.
 *
 * @param url - The request URL.
 * @param data - The request body (partial update).
 * @param config - Optional request configuration.
 * @returns The HTTP response with typed data.
 */
export const patch = <T = unknown>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<HttpResponse<T>> => getClient().patch<T>(url, data, config)

/**
 * Makes a DELETE request using the bonded HTTP client.
 *
 * @param url - The request URL.
 * @param config - Optional request configuration.
 * @returns The HTTP response with typed data.
 */
export const del = <T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> =>
  getClient().delete<T>(url, config)

/**
 * Pre-created fetch client for environments where `fetch` is available.
 * `null` in environments without a global `fetch`.
 */
export const fetchClient = typeof fetch !== 'undefined' ? createFetchClient() : null
