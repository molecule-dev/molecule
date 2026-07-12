/**
 * Client HTTP interface for molecule.dev.
 *
 * Provides a unified HTTP client API that works across different
 * HTTP libraries (fetch, axios, ky, etc.).
 *
 * @example
 * ```tsx
 * // In a React component, get the configured client from context and call it.
 * // The hook is exported by the framework binding (@molecule/app-react), not
 * // this core package — never construct your own fetch/axios client.
 * import { useHttpClient } from '@molecule/app-react'
 *
 * function Plants() {
 *   const http = useHttpClient()
 *   const load = async () => {
 *     const res = await http.get<Plant[]>('/plants')   // baseURL ('/api') is prepended
 *     setPlants(res.data)
 *   }
 *   // http.post(url, body), http.put, http.delete are also available.
 * }
 * ```
 *
 * @remarks
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
