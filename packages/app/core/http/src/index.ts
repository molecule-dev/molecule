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
 * Make ALL API calls through this client (via the framework hook
 * `useHttpClient()` in React / `useHttpClient()` composable in Vue) — it carries
 * the configured `baseURL`, auth headers, and interceptors. Pass paths RELATIVE
 * to `baseURL` (e.g. `'/plants'`, not `'/api/plants'` when `baseURL` is already
 * `'/api'`). Do NOT call `fetch()` / `axios` directly in components — that
 * bypasses auth + base-URL config and breaks when the transport is swapped.
 *
 * @module
 */

export * from './client.js'
export * from './interceptors.js'
export * from './provider.js'
export * from './types.js'
export * from './unwrap.js'
export * from './utilities.js'
