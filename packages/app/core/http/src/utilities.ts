/**
 * HTTP bond accessor and convenience request functions.
 *
 * If no custom client is bonded, a fetch-based client is returned — it is NOT
 * bonded, so a client bonded later is what every subsequent call sees.
 * Provides `get`, `post`, `put`, `patch`, and `del` shorthand functions that
 * delegate to the bonded client.
 *
 * @module
 */

import { bond, get as bondGet } from '@molecule/app-bond'
import { getLogger } from '@molecule/app-logger'

import type { HttpClient } from './client.js'
import { createFetchClient } from './provider.js'
import type { HttpResponse, RequestConfig } from './types.js'

const BOND_TYPE = 'http-client'

/** One warning per page load is enough to name a missing bond. */
let warnedAboutFallback = false

/**
 * The client `getClient()` returns while nothing is bonded.
 *
 * Module-level and deliberately NEVER bonded: bonding it made the fallback the
 * page's shared client, so a caller that read `getClient()` before
 * `setClient()` captured a no-baseURL client that every later `setClient()`
 * could not reach — the app's real client was bonded and the caller's token
 * sync kept writing into the orphan, so every request went out bare
 * (xr-molecule-flash-m156, 401 `token is missing` after a reload).
 */
let unbondedFallback: HttpClient | null = null

/**
 * The auth client whose token every HTTP client starts with, or null.
 *
 * `setClient` applies it at bond time, which is the only moment that can reach a
 * client created AFTER the auth setup ran — the scaffold wires auth before http,
 * so the auth bond's initial token had no client to land on
 * (`createDefaultAuthClientWithHttpSync` in `@molecule/app-bonds-default-react`).
 */
let authTokenSource: (() => string | null | undefined) | null = null

/**
 * Registers the token source a newly bonded client is hydrated from, or clears
 * it with `null`.
 *
 * The source is read once per bond: the client bonded AFTER this call (and the
 * one bonded now, if any) receives `source()` through `setAuthToken`. That is
 * what carries a restored session's token into a client the auth setup ran
 * before — the setup does not need to hold a client reference at all.
 *
 * @param source - Returns the current access token (null when signed out), or `null` to clear.
 *
 * @example
 * ```typescript
 * setAuthTokenSource(() => authClient.getAccessToken())
 * ```
 */
export const setAuthTokenSource = (source: (() => string | null | undefined) | null): void => {
  authTokenSource = source
  const bonded = bondGet<HttpClient>(BOND_TYPE)
  if (bonded && source) bonded.setAuthToken(source() ?? null)
}

/**
 * Registers an HTTP client as the active singleton.
 *
 * A registered `setAuthTokenSource` token source is applied to the client
 * here, so a client bonded after the auth setup still carries the restored
 * session's token.
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
  if (authTokenSource) client.setAuthToken(authTokenSource() ?? null)
}

/**
 * Retrieves the bonded HTTP client. If none is bonded, returns a module-level
 * fetch-based fallback — it is NOT bonded.
 *
 * The fallback has NO `baseURL` — a core cannot know an app's API prefix. A relative
 * call then resolves against the page origin, where a dev server answers its own HTML
 * shell with a 200. It warns once so the misconfiguration is named instead of showing up
 * as a crash three components later; a scaffold bonds the shared client with its API
 * prefix, so the fallback only runs in an app that never bonded one.
 *
 * Returning it WITHOUT bonding is what keeps a later `setClient()` authoritative: a
 * caller that captured this fallback early does not make it the app's client, so the
 * scaffold's client (and its token source) still takes effect for every later call.
 *
 * @returns The active HTTP client, or the unbonded fallback when none is bonded.
 */
export const getClient = (): HttpClient => {
  const existing = bondGet<HttpClient>(BOND_TYPE)
  if (existing) return existing
  if (!unbondedFallback) unbondedFallback = createFetchClient()
  if (!warnedAboutFallback) {
    warnedAboutFallback = true
    getLogger('http').warn(
      '@molecule/app-http: no client is bonded — requests go to the page origin with no baseURL. ' +
        "Bond one: setClient(createFetchClient({ baseURL: '/api' })).",
    )
  }
  return unbondedFallback
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
 * The body is `data` — the SECOND argument. `post(url, { data: body })` sends the JSON body
 * `{"data":body}`, not `body`, so the API finds none of its fields at the top level; pass the
 * body directly (`post('/users', { user })`). The config is the THIRD argument.
 *
 * @param url - The request URL.
 * @param data - The request body itself (never `{ data: body }`).
 * @param config - Optional request configuration (headers, params, timeout).
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
 * The body is `data` — the SECOND argument, never `{ data: body }`.
 *
 * @param data - The request body itself.
 * @param config - Optional request configuration (the third argument).
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
 * The body is `data` — the SECOND argument, never `{ data: body }`.
 *
 * @param data - The request body itself (the partial update).
 * @param config - Optional request configuration (the third argument).
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
