/**
 * Client HTTP interface for molecule.dev.
 *
 * Provides a unified HTTP client API that works across different
 * HTTP libraries (fetch, axios, ky, etc.).
 *
 * **The body is the SECOND argument: `post(url, data, config?)` — likewise `put` and `patch`,
 * and the response is `HttpResponse<T>` (read `.data` for the body).** `data` IS the request
 * body; a plain object is serialized as the JSON body. Passing `{ data: body }` there is NOT a
 * config object — it makes the wire body `{"data":{…}}`, so the API sees an object whose only
 * key is `data`, finds none of the fields it validates, and answers
 * `422 {"errors":{"username":["can't be blank"],…}}`. Write `post('/users', { user })`, never
 * `post('/users', { data: { user } })`. The config object (headers, params, timeout,
 * `skipAuthGate`) is the THIRD argument. Only `request({ method, url, data, … })` takes `data`
 * inside an options object, because there that object IS the config.
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
 *     const res = await http.get<Plant[]>('/plants')   // the bonded client's baseURL ('/api') is prepended
 *     setPlants(res.data)
 *   }
 *   // Body-carrying verbs take the body as the SECOND argument:
 *   //   http.post('/plants', plant)      — wire body is `plant`
 *   //   http.post('/plants', { data: plant })  — WRONG: wire body is `{"data": plant}`
 *   // http.put(url, body), http.patch(url, body) and http.delete(url) are also available.
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
 * - **Pass RELATIVE paths; never a hardcoded host.** Use `'/plants'` (the BONDED client's
 *   `baseURL` — `'/api'` in a scaffold — is prepended), NOT `'/api/plants'`, and NEVER an
 *   absolute dev URL like `'http://localhost:4000/api/…'`. A hardcoded `localhost`/host works on
 *   the author's machine, then fails cross-origin (CORS) in the preview and points at the wrong
 *   server in production. The base URL is configured ONCE (via `setClient`), not per call.
 * - **`getClient()` itself knows no baseURL.** The fallback client it mints when nothing is
 *   bonded has `baseURL: ''`, so `getClient().get('/articles')` requests the PAGE origin — in
 *   dev the Vite server answers its own `index.html` with a 200, and the HTML arrives as
 *   `data` (xr-molecule-flash-m126 lost 6.5 minutes to that). A scaffold bonds
 *   `'/api'`; an app that builds its own client must pass `{ baseURL }`.
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
 * Waiting for the restore does NOT attach the token: a client created beside the auth bond needs
 * `createDefaultHttpClientWithAuthBearer({ baseURL, getToken: () => authClient.getAccessToken(),
 * authScheme })` from `@molecule/app-bonds-default-react` (or an auth client built with
 * `createDefaultAuthClientWithHttpSync`, which mirrors the token into the bonded client), because
 * `setAuthGate` alone sends no `Authorization` header.
 *
 * **The gate never holds its own restore's request.** A request the settle function issues
 * while it runs (its call reaches this client before the function awaits anything) is part of
 * the restore it is waiting for, so it goes out immediately — `setAuthGate(() =>
 * restoreSession())` does not deadlock even when `restoreSession` uses this client. A restore
 * that awaits something else first and only then calls the client reaches it after that
 * window, and that request must opt out of the gate: `http.get(currentUserEndpoint, {
 * skipAuthGate: true })`. Without the opt-out the gate waits on itself, the restore never
 * settles, and every request the gate holds stalls until it times out (3 s).
 * `@molecule/app-auth`'s own restore does not need it (it calls `fetch`, not this client).
 *
 * **A failed request's `status` is `0` when NO response arrived — never read it as
 * "signed out".** An aborted request (an `AbortController` signal, a component's
 * effect cleanup, a route change tearing the fetch down) and a network outage both
 * throw an `HttpError` with `status === 0`; the aborted ones also carry
 * `aborted: true` and the `http.error.aborted` key, the rest `http.error.networkError`.
 * Neither says anything about the session. To decide whether a session ended, use
 * `isAuthFailure(err)` (401/403 only); `isNoResponse(err)` identifies the no-response
 * case so a caller can stay silent instead of reporting an outage. **Do not write
 * `err instanceof HttpError && err.status < 500` as a sign-out check** — it clears
 * the session on every aborted navigation request.
 *
 * @module
 */

export * from './auth-gate.js'
export * from './client.js'
export * from './errors.js'
export * from './interceptors.js'
export * from './provider.js'
export * from './types.js'
export * from './unwrap.js'
export * from './utilities.js'
