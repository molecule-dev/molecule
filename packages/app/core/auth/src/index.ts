/**
 * Client-side authentication interface for molecule.dev.
 *
 * Provides a unified auth API that works across different auth strategies
 * (JWT, session, OAuth, etc.): `createJWTAuthClient` builds a fetch-based
 * client; `setClient`/`getClient` bond it; `login`/`logout`/`register`/
 * `isAuthenticated`/`getUser` delegate to the bonded client. Framework
 * bindings (e.g. `AuthProvider`/`useAuth` in `@molecule/app-react`) wrap the
 * same client.
 *
 * @remarks
 * - **An API with its own auth envelope keeps this client.** `requestBody` wraps the
 *   login/register payload (`(kind, p) => ({ user: p })`), `mapAuthResponse` reads the
 *   token and user out of the answer (`(d) => ({ accessToken: d.user.token, user: d.user })`),
 *   and `authScheme: 'Token'` sends `Authorization: Token <jwt>` — both are fields of the
 *   `AuthClientConfig` the client is CONSTRUCTED with
 *   (`setClient(createJWTAuthClient({ authScheme: 'Token', … }))` in the auth bond), not
 *   properties of a client that already exists. Do not hand-write an auth client for a spec
 *   like RealWorld.
 * - **Whether a reload keeps the user signed in is `AuthClientConfig.storage`,
 *   and one of the two routes must be wired.** The client's own default is
 *   `'memory'`, which is lost on reload, so a session survives one only by
 *   having a credential that survived: (1) `storage: createBrowserStorageAdapter()`
 *   — the browser's `localStorage`, what a scaffolded app's `authConfig` passes
 *   (see `@molecule/app-auth`'s `createBrowserStorageAdapter` for the trade: Web
 *   Storage is script-readable, so an XSS can steal the token), or (2) an
 *   httpOnly session cookie the API sets at login, which `initialize()` restores
 *   through `currentUserEndpoint` (default `/users/me`) — the stronger option
 *   wherever the API supports it, and what `@molecule/api-resource-user` issues.
 *   Wire `initialize()` once at startup either way. Do NOT hand-roll a token
 *   store beside the client for this: it is a config field.
 * - **Endpoint defaults must match your API's real routes** (`/auth/login`,
 *   `/auth/register`, `/auth/refresh`, `/users/logout`, `/users/me`, …).
 *   Align them via `createJWTAuthClient({ baseURL, ...endpoints })` — never by
 *   hand-editing fetch calls in components.
 * - **Do not fetch viewer-dependent data before the restore settles.** A component
 *   effect that runs on mount fires while `initialize()` is still restoring, so its
 *   request leaves without the `Authorization` header and the server answers for an
 *   anonymous viewer — a followed user renders "Follow", a saved item renders unsaved.
 *   On localhost the restore usually wins this race; over the network it does not, so
 *   the bug appears only on the deployed URL. Two ways out: gate the fetch on the auth
 *   state being settled (`state.initialized`), or let the HTTP client do it — bond the
 *   auth client through `@molecule/app-bonds-default-react`, which registers
 *   `whenRestored()` as the http gate so every request waits for the restore.
 * - **Your own session store's gate must exempt its restore's own request.** This client
 *   restores with `fetch`, so the gate registered over it never holds the restore. A store
 *   that restores THROUGH the bonded HTTP client and registers that restore as the gate
 *   (`setAuthGate(() => store.whenSettled())`) waits on itself unless the restore's request
 *   passes `skipAuthGate: true` — otherwise the gate holds the very request it is waiting
 *   for, and every request it holds stalls until the gate times out. See
 *   `RequestConfig.skipAuthGate` in `@molecule/app-http`.
 * - Client-side auth state is UX only — the server enforces authorization on
 *   every request; hiding a screen is not protection.
 *
 * @example
 * ```typescript
 * import { createJWTAuthClient, setClient } from '@molecule/app-auth'
 *
 * const client = createJWTAuthClient({ baseURL: '/api' })
 * setClient(client)
 * await client.initialize() // restore the session from the httpOnly cookie
 *
 * // anywhere in the app
 * import { getUser, isAuthenticated, login, logout } from '@molecule/app-auth'
 * await login({ email, password })
 * if (isAuthenticated()) console.log(getUser()?.email)
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Logging in with VALID credentials on the real login screen resolves
 *   `login()` and flips AuthState to `authenticated: true` with `getUser()`
 *   returning the actual UserProfile — the UI shows that user's own `email` /
 *   `name` / `avatar`, never a placeholder or a different account.
 * - [ ] A WRONG password shows a visible error (AuthState `error` is set and
 *   the promise rejects) and establishes NO session: `isAuthenticated()` stays
 *   false and no protected screen becomes reachable.
 * - [ ] Registering through the sign-up form calls `register()`, creates the
 *   account, and lands authenticated (`authenticated: true`, `user` populated)
 *   on the app's post-signup screen — not back on the login form. If the flow
 *   shows an email-verification / "check your inbox" step, it must be genuinely
 *   backed (this client's `register()` returns an authenticated session
 *   directly and exposes no verify method) — never a dead screen the auth
 *   contract cannot advance past.
 * - [ ] Logout calls `logout()` and clears the session (`authenticated: false`,
 *   `user: null`, tokens cleared); afterward every protected screen redirects
 *   back to login.
 * - [ ] Visiting a protected route while logged OUT redirects to login (the
 *   guard reads `isAuthenticated()`), and after authenticating you land back on
 *   the originally-requested screen rather than a generic home.
 * - [ ] The session survives a FULL page reload: after login, hard-reload → you
 *   stay signed in (the profile/sign-out UI a signed-in visitor sees is still
 *   there), and you are NOT bounced to login. Which route does it is the app's
 *   `AuthClientConfig.storage`: the scaffold's `createBrowserStorageAdapter()` keeps
 *   the token in the browser, an httpOnly session cookie is restored by
 *   `initialize()` through `currentUserEndpoint` (default `/users/me`). If the
 *   app has neither — `storage` left at `'memory'` against an API that sets no
 *   cookie — this box cannot be checked, and the fix is the config, not a token
 *   store written beside the client.
 * - [ ] Password reset round-trips: `requestPasswordReset({ email })` then
 *   `confirmPasswordReset({ token, password })` with the emailed token, after
 *   which `login()` with the NEW password succeeds and the OLD password no
 *   longer works.
 * - [ ] Authorization holds: a signed-in user only ever reads/edits their OWN
 *   record (`getUser()` is the caller's profile, never another user's); the
 *   token's storage is the deliberate choice `AuthClientConfig.storage` names —
 *   if it is Web Storage (the scaffold default, which a reload requires when the
 *   API sets no cookie), say so in the app's own words rather than leaving a
 *   second, undocumented store beside it; and an expired/invalid token fails
 *   closed — the app re-authenticates (`refresh()` or `logout()`), never
 *   silently serving another user's data.
 *
 * @module
 */

export * from './browser-storage.js'
export * from './client.js'
export * from './provider.js'
export * from './token.js'
export * from './types.js'
export * from './utilities.js'
