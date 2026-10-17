/**
 * Axios HTTP client provider for `@molecule/app-http`.
 *
 * This package provides an Axios-based implementation of the molecule HttpClient interface,
 * allowing you to use molecule's HTTP abstractions with Axios.
 *
 * **The body is the SECOND argument: `post(url, data, config?)` — likewise `put` and `patch`.**
 * `data` IS the request body, so `post(url, { data: body })` sends the JSON body
 * `{"data":body}`, not `body`, and the API finds none of its fields at the top level (it
 * answers `422 {"errors":{"username":["can't be blank"],…}}`). Write `post('/users', { user })`,
 * never `post('/users', { data: { user } })`; a config (headers, params) is the THIRD argument.
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
 * - An API whose scheme is not `Bearer` (`Authorization: Token <jwt>`) passes
 *   `authScheme: 'Token'` to THIS package's constructor —
 *   `setClient(createAxiosClient({ baseURL, authScheme: 'Token' }))` — and the auth
 *   token is then sent with that scheme. It is NOT a property of the client
 *   `setClient()`/`getClient()` hands around: that is a built `HttpClient`, and
 *   `client.authScheme = 'Token'` is a type error that changes no header. The option
 *   name is the same one `@molecule/app-http`'s `HttpClientConfig` declares, so the
 *   config reads the same whichever transport is bonded.
 * - `instance`/`axiosConfig` accept raw Axios options — anything the app sets
 *   there couples it to Axios; keep app code on the `@molecule/app-http`
 *   interface so the bond stays swappable.
 */

export * from './provider.js'
export * from './types.js'
