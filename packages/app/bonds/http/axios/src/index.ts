/**
 * Axios HTTP client provider for `@molecule/app-http`.
 *
 * This package provides an Axios-based implementation of the molecule HttpClient interface,
 * allowing you to use molecule's HTTP abstractions with Axios.
 *
 * @module `@molecule/app-http-axios`
 *
 * @example
 * ```ts
 * import { createAxiosClient } from '@molecule/app-http-axios'
 * import { setClient } from '@molecule/app-http'
 *
 * const client = createAxiosClient({
 *   baseURL: 'https://api.example.com',
 *   timeout: 10000,
 * })
 *
 * setClient(client)
 *
 * // Now use via `@molecule/app-http`
 * import { get, post } from '@molecule/app-http'
 * const users = await get('/users')
 * const newUser = await post('/users', { name: 'John' })
 * ```
 *
 * @remarks
 * - **Call `setClient(...)` at startup, BEFORE any `get`/`post` from
 *   `@molecule/app-http` runs.** The core's `getClient()` lazily bonds its own
 *   fetch-based fallback on first use — requests issued before `setClient()`
 *   silently bypass the Axios client (no interceptors, no auth token).
 * - `get()`/`post()`/… resolve to `HttpResponse<T>` — read `.data` for the
 *   body (`const { data: users } = await get('/users')`).
 * - The exported `provider` constant is a pre-built default client (no baseURL,
 *   30 s timeout); prefer `createAxiosClient({...})` so baseURL/credentials are
 *   explicit.
 * - `instance`/`axiosConfig` accept raw Axios options — anything the app sets
 *   there couples it to Axios; keep app code on the `@molecule/app-http`
 *   interface so the bond stays swappable.
 */

export * from './provider.js'
export * from './types.js'
