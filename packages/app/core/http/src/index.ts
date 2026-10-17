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
 * An API that wants another scheme than `Bearer` (`Authorization: Token <jwt>`) passes
 * `authScheme: 'Token'` to the client's CONSTRUCTOR — `setClient(createFetchClient({ baseURL,
 * authScheme: 'Token' }))`, or the bonded provider's constructor
 * (`createAxiosClient({ … })` from `@molecule/app-http-axios`). It is NOT a property of
 * `getClient()`'s result: that is a built client, and `client.authScheme = 'Token'` is a type
 * error (TS2339) that changes no header. Do not hand-write a fetch wrapper for the scheme either.
 *
 * A request made while the session is still being restored WAITS for that restore, so a page
 * that fetches viewer-dependent data on mount (a profile's `following` flag, a feed, a
 * `favorited` state) cannot go out unauthenticated and answer for an anonymous viewer. The auth
 * bond registers that wait with `setAuthGate`; apps that bond auth through
 * `@molecule/app-bonds-default-react` get it without doing anything. An app with its own session
 * module registers its own: `setAuthGate(() => session.whenRestored())`.
 *
 * **A request the gate itself depends on must opt out of it: pass `skipAuthGate: true`.** A gate
 * that waits for a session restore whose own request goes through this client waits on itself —
 * that request is held by the gate waiting for it, so the restore never settles and every request
 * the gate holds stalls until it times out (3 s). The request that restores the session for a gate
 * you registered yourself is therefore written
 * `http.get(currentUserEndpoint, { skipAuthGate: true })`; `@molecule/app-auth`'s own restore does
 * not need it (it calls `fetch`, not this client).
 *
 * @module
 */

export * from './auth-gate.js'
export * from './client.js'
export * from './interceptors.js'
export * from './provider.js'
export * from './types.js'
export * from './unwrap.js'
export * from './utilities.js'
