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

import type { AuthTokenResolver, HttpClient } from './client.js'
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
 * (a 401 `token is missing` after a reload).
 */
let unbondedFallback: HttpClient | null = null

/**
 * The auth client whose token every HTTP client the app bonds resolves on every request,
 * or null.
 *
 * `setClient` installs it, which is the only moment that can reach a client created AFTER
 * the auth setup ran — the scaffold wires auth before http, so the auth bond's initial
 * token had no client to land on (`createDefaultAuthClientWithHttpSync` in
 * `@molecule/app-bonds-default-react`). The client then reads the source itself for each
 * request instead of holding a token copied at bond time: a session adopted mid-page —
 * `setSession()`, the OAuth callback's `setAccessToken()` — changes the token with no auth
 * event and, when the profile data is unchanged, with no state notification either, so a
 * copy would keep sending the previous account's bearer.
 */
let authTokenSource: AuthTokenResolver | null = null

/**
 * The source each client WITHOUT {@link HttpClient.setAuthTokenResolver} follows (a transport
 * written against the previous interface), read by the request interceptor
 * {@link applyAuthTokenSource} adds to that client once.
 */
const interceptedSources = new WeakMap<HttpClient, AuthTokenResolver | null>()

/**
 * Gives one client the app's token source, or takes it away.
 *
 * A client that implements {@link HttpClient.setAuthTokenResolver} reads the source itself as
 * it assembles each request. One that does not gets a request interceptor that pushes
 * `source()` through `setAuthToken` before each of its requests: a transport that applies its
 * token after running its interceptors (as `createFetchClient` does) sends the current session
 * on that same request, and one that applies it before them (`@molecule/app-http-axios`
 * before 1.2.0) from the following request on.
 *
 * Either way the client is hydrated now. Taking the source away leaves the client on the token
 * the source returned at that moment, under `setAuthToken`'s control from then on — never on
 * an older copy taken at bond time.
 *
 * @param client - The client receiving the source.
 * @param source - The source to install, or `null` to take it away.
 * @param previous - The source this call replaces or removes, if any.
 */
const applyAuthTokenSource = (
  client: HttpClient,
  source: AuthTokenResolver | null,
  previous: AuthTokenResolver | null,
): void => {
  if (client.setAuthTokenResolver) {
    client.setAuthTokenResolver(source)
  } else {
    if (!interceptedSources.has(client)) {
      client.addRequestInterceptor((config) => {
        const current = interceptedSources.get(client)
        if (current) client.setAuthToken(current() ?? null)
        return config
      })
    }
    interceptedSources.set(client, source)
  }
  const settled = source ?? previous
  if (settled) client.setAuthToken(settled() ?? null)
}

/**
 * Registers the token source every bonded client reads on EACH request, or removes it with
 * `null`.
 *
 * Every client that receives the source — the one bonded now, any bonded later, and the
 * fallback {@link getClient} returns while none is bonded — is hydrated from `source()` and
 * reads it again for every request: through {@link HttpClient.setAuthTokenResolver} where the
 * client implements it (`createFetchClient`, `@molecule/app-http-axios` from 1.2.0), else
 * through a request interceptor that pushes it with `setAuthToken`, which a transport applying
 * its token after its interceptors sends on that same request and one applying it before them
 * from the next request on. So a restored session reaches a client bonded after the auth setup
 * (which holds no client reference), and a session adopted later with no auth event
 * (`setSession`, `setAccessToken`) never leaves the previous account's bearer on the wire.
 *
 * A source that returns `null` means "no body token": the client sends no `Authorization`
 * header of its own (see {@link HttpClient.setAuthTokenResolver} for why a kept bearer is a
 * bug). A header passed per request or in a client's default headers keeps the precedence that
 * client's transport gives it over the client's token.
 *
 * A replaced source is followed from the next request on. Removing it (`null`) leaves the
 * bonded client (and the fallback) on the token the source returned at that moment, as a
 * static token that `setAuthToken` controls from then on.
 *
 * @param source - Returns the current access token (null when signed out), or `null` to remove it.
 *
 * @example
 * ```typescript
 * setAuthTokenSource(() => authClient.getAccessToken())
 * ```
 */
export const setAuthTokenSource = (source: AuthTokenResolver | null): void => {
  const previous = authTokenSource
  authTokenSource = source
  const bonded = bondGet<HttpClient>(BOND_TYPE)
  if (bonded) applyAuthTokenSource(bonded, source, previous)
  if (unbondedFallback && unbondedFallback !== bonded) {
    applyAuthTokenSource(unbondedFallback, source, previous)
  }
}

/**
 * Registers an HTTP client as the active singleton.
 *
 * A registered `setAuthTokenSource` token source is applied to the client
 * here, so a client bonded after the auth setup resolves the restored
 * session's token on every request it makes.
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
  if (authTokenSource) applyAuthTokenSource(client, authTokenSource, null)
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
 * The fallback follows a registered `setAuthTokenSource` source like a bonded client
 * does, so an app that bonds no client at all still sends the current session.
 *
 * @returns The active HTTP client, or the unbonded fallback when none is bonded.
 */
export const getClient = (): HttpClient => {
  const existing = bondGet<HttpClient>(BOND_TYPE)
  if (existing) return existing
  if (!unbondedFallback) {
    unbondedFallback = createFetchClient()
    if (authTokenSource) applyAuthTokenSource(unbondedFallback, authTokenSource, null)
  }
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
