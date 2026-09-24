/**
 * Client HTTP interface for molecule.dev.
 *
 * Provides a unified HTTP client API that works across different
 * HTTP libraries (fetch, axios, ky, etc.).
 *
 * @example
 * ```typescript
 * import { get, post, setClient, unwrapList } from '@molecule/app-http'
 * import { createAxiosClient } from '@molecule/app-http-axios'
 *
 * // Startup (bonds.ts) — BEFORE the first request, or early calls use the built-in fetch fallback.
 * setClient(createAxiosClient({ baseURL: '/api', timeout: 10_000 }))
 *
 * interface Plant {
 *   id: string
 *   name: string
 * }
 *
 * const res = await get<Plant[]>('/plants') // → GET /api/plants
 * const plants = unwrapList<Plant>(res) // accepts `Plant[]` AND `{ data: Plant[] }` bodies
 * console.log(plants.map((plant) => plant.name)) // ['Fern', 'Cactus']
 *
 * const created = await post<Plant>('/plants', { name: 'Monstera' }) // body sent as JSON
 * console.log(created.status, created.data.id) // 201 'p3'
 * ```
 *
 * @remarks
 * - Every call resolves to `HttpResponse<T>` — the body is `.data`, not the return value
 *   itself. Non-2xx responses REJECT with `HttpError` (`error.status`), they do not resolve.
 * - In React components use `useHttpClient()` from `@molecule/app-react` (same methods);
 *   outside components use the `get`/`post`/`put`/`patch`/`del` functions above (`delete`
 *   is a reserved word — the function is `del`).
 *
 * Make ALL API calls through this client (via the framework hook `useHttpClient()` in
 * React / the Vue composable) — it carries the configured `baseURL`, auth headers, and
 * interceptors. Do NOT call `fetch()` / `axios` directly in components — that bypasses auth
 * + base-URL config and breaks when the transport is swapped.
 *
 * Two mistakes that break in preview/production (seen in real imported apps):
 * - **Pass RELATIVE paths; never a hardcoded host.** Use `'/plants'` (the `baseURL` `'/api'`
 *   is prepended), NOT `'/api/plants'`, and NEVER an absolute dev URL like
 *   `'http://localhost:4000/api/…'`. A hardcoded `localhost`/host works on the author's
 *   machine, then fails cross-origin (CORS) in the preview and points at the wrong server in
 *   production. The base URL is configured ONCE (via `setClient`), not per call.
 * - **The client is PUBLIC — never put a secret in it.** Anything the browser sends (an API
 *   key, a service-role / `sk_…` key, a signing secret) is visible to every user. Secrets
 *   stay in YOUR API; the browser calls your API and the API uses the secret server-side.
 *   Only a publishable/public key may ever be client-side.
 *
 * Auth (the bearer token / session cookie) is attached by the client's interceptors — do not
 * read a token from `localStorage` or hand-attach it (the token is memory-only; see the user
 * resource).
 *
 * @module
 */

export * from './client.js'
export * from './interceptors.js'
export * from './provider.js'
export * from './types.js'
export * from './unwrap.js'
export * from './utilities.js'
