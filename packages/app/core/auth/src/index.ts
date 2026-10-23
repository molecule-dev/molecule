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
 * **In a scaffolded app, wire it by hand — the sandbox cannot run `mlcl add`.**
 * The package is already installed; create the client once at startup with
 * `setClient(createJWTAuthClient({ baseURL, authScheme: 'Token', storage:
 * createBrowserStorageAdapter() }))`, or `createDefaultAuthClient(authConfig)`
 * from `@molecule/app-bonds-default-react` (which also registers
 * `whenRestored()` as the HTTP gate), call `initialize()`, and read the session
 * through `MoleculeProvider`/`useAuth()` in a React app.
 *
 * **`initialize()` restores the session BEFORE the first render, and no
 * hand-rolled token store may replace it.** With the token AND user in the
 * store the restore is synchronous and costs no request; with an httpOnly
 * session cookie the API sets at login it restores through
 * `currentUserEndpoint` (default `/users/me`). `AuthClientConfig.storage` is
 * the config field that decides which route a reload takes. A store written
 * beside the client answers requests before its own restore settles: the first
 * authenticated page renders signed-out, and its 401 signs the user out for
 * good.
 *
 * **Calling `initialize()` is optional — initialization is lazy and idempotent.**
 * The first read of the client (`getState()`, `subscribe()`/`onAuthChange()`, a
 * `useAuth()` mount, `isAuthenticated()`, `getUser()`) starts the same one restore,
 * and an explicit `initialize()` returns the same promise, so a second call asks the
 * server nothing. Keep the template's explicit call (it makes the first render
 * deterministic); an entry file that drops it still restores instead of reporting
 * `'loading'` forever (xr-molecule-flash-m192: a `main.tsx` rewrite dropped the line
 * and 18 tests timed out on pages that never left their loading branch).
 *
 * **Never fetch viewer-dependent data before the restore settles.** A
 * component effect that runs on mount fires while `initialize()` is still
 * restoring, so its request leaves without the `Authorization` header and the
 * server answers for an anonymous viewer — a followed user renders "Follow", a
 * saved item renders unsaved. On localhost the restore usually wins this race;
 * over the network it does not, so the bug appears only on the deployed URL.
 * Gate the fetch on the auth state being settled (`state.initialized`), or let
 * the HTTP client do it: `@molecule/app-bonds-default-react` registers
 * `whenRestored()` as the gate so every request waits for the restore.
 * Waiting for the restore does NOT attach its token: a separately created HTTP
 * client needs
 * `createDefaultHttpClientWithAuthBearer({ baseURL, getToken: () => authClient.getAccessToken(), authScheme })`
 * from `@molecule/app-bonds-default-react` plus
 * `setAuthGate(() => authClient.whenRestored())` from `@molecule/app-http` — or
 * the auth client built with `createDefaultAuthClientWithHttpSync`, which
 * mirrors the token into the bonded client.
 *
 * **`getState().status` is the session state to render, in one value.**
 * `'loading'` (no decision yet) → `'authenticated'` / `'unauthenticated'`, and
 * `'unavailable'` when a stored session exists but the server could not confirm it.
 * **A stored token AND a stored user make the FIRST render `'authenticated'`**:
 * `initialize()` sets that state synchronously, before any request, and every
 * verification settles behind that render. Never hold the first paint on
 * `validateSession()` or a `/me` request of your own — a protected page then pays
 * an API round trip on every navigation (xr-molecule-flash-m177: ~30 full page
 * loads in one pagination spec; its four tests sat at 15.0–15.9 s of a 15 s
 * budget and the grader timed two out). Route guards read this same `status`:
 * wait only while it is `'loading'` — that status means "no decision yet", so an
 * auth request in flight (`state.loading`) keeps the decided status and does not
 * unmount a Login/Register page mid-request (xr-molecule-flash-m380).
 * `validateSession()` is the background re-check that produces the last two: call
 * it after the first render — a 401 or 403 clears the token (`'unauthenticated'`),
 * while a network failure, a 5xx, or a 404 from a wrong `currentUserEndpoint`
 * KEEPS the token and the user (`'unavailable'`, retryable; the 404 error names
 * `currentUserEndpoint`). Do not build a
 * `validating`/`unavailable` flag beside the client: a second module-level state
 * plus its own listener set is a second session store, and it drifts from the
 * client's.
 *
 * **Only a 401/403 ENDS a session; no response at all never does.** Every path that
 * clears the stored session (`validateSession`, the cookie restore, the initial
 * refresh, the background refresh timer) keys on the server REJECTING the
 * credential. An aborted request, a dropped connection, or a 5xx arrives with no
 * HTTP status (or `status: 0` from `@molecule/app-http`) and says nothing about the
 * session: the token and user are kept and the state becomes `'unavailable'` so a
 * later load or retry can restore it. An app's own code must use the same test —
 * `isAuthFailure(err)` from `@molecule/app-http` (401/403 only) — never
 * `err.status < 500`, which is true for an aborted navigation request and signs the
 * user out on a route change.
 *
 * **A rejected call keeps the API's error body.** Every non-ok response rejects
 * the promise with an {@link I18nError} whose `i18nKey` is the server's
 * `errorKey` (or `auth.error.requestFailed`) — and the thrown error carries the
 * HTTP `status` and the parsed response `body` (see {@link AuthError}). The
 * whole parsed body is preserved, nested maps and arrays included, not just the
 * `error`/`message` the message is built from, so a login form can render the
 * API's own validation payload (`{ errors: { credentials: ['is invalid'] } }`)
 * instead of re-implementing the call. A body that is not JSON arrives as `{}`;
 * the key, message, fallback and rejection are unchanged.
 *
 * **`autoRefresh` does nothing without a refresh token — and must never log the
 * user out.** The client schedules a refresh only when `refresh()` could actually
 * succeed, i.e. when a refresh token is stored. An API that issues none (the
 * `@molecule/api-resource-user` model: login/register return `{ accessToken,
 * user }` and the durable session is an httpOnly cookie the SERVER refreshes)
 * therefore schedules nothing: the session stays until the API answers 401
 * (`validateSession()` clears it) or the user logs out. `autoRefresh: true`
 * against such an API is harmless but pointless — leave it `false`.
 *
 * **Seeding a session from an exchange the app runs itself: `setSession()`.** When an OAuth
 * redirect or the app's own sign-in endpoint has already issued the token and returned the
 * user, `setSession({ accessToken, user })` stores both and flips the client to
 * `authenticated` in one update, so every hook reading the shared client is signed in at once
 * (a form's own sign-in code wrote the token and the user with `setAccessToken`/`setUser`,
 * which change their field only — the UI stayed signed out and nine browser assertions timed
 * out, xr-molecule-flash-m178). `setAccessToken()` and `setUser()` are field setters, not a
 * sign-in: neither sets `authenticated`.
 *
 * **A custom user profile is typed once and used everywhere: `AuthClientConfig<MyUser>`,
 * `createJWTAuthClient<MyUser>` and `useAuth<MyUser>()`.** The config's generic makes
 * `mapAuthResponse` return `AuthResult<MyUser>`, so a mapper that omits a required custom
 * field fails at the factory call instead of shipping a signed-in page whose navbar reads
 * `undefined` (xr-molecule-flash-m255: the mapper kept `id`/`name`/`avatar` but dropped
 * `username`, and the signed-in controls never rendered although login succeeded). Keep the
 * wire user's fields and ADD the base identity fields; do not rebuild the profile field by
 * field, and never hide a mismatch with `as unknown as MyUser`:
 *
 * ```typescript
 * import type { AuthClientConfig, UserProfile } from '@molecule/app-auth'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 *
 * interface MyUser extends UserProfile {
 *   username: string
 *   image: string
 * }
 *
 * const config: AuthClientConfig<MyUser> = {
 *   mapAuthResponse: (data) => {
 *     const { user: wire } = data as { user: { token: string } & Omit<MyUser, 'id'> }
 *     return {
 *       accessToken: wire.token,
 *       user: {
 *         // Every wire field the pages read (`username`, `image`, …) survives…
 *         ...wire,
 *         // …plus the base fields the client derives its identity from.
 *         id: wire.username,
 *         name: wire.name ?? wire.username,
 *         avatar: wire.image,
 *       },
 *     }
 *   },
 * }
 *
 * const client = createJWTAuthClient<MyUser>(config)
 * // React: `useAuth<MyUser>()` reads the same profile.
 * ```
 *
 * **A profile-update transport that is not `PATCH` with bare JSON is a CONFIG field, not a
 * hand-written client.** `updateProfile()` sends to `profileEndpoint` with `PATCH` and the
 * `Partial<T>` as the body by default; an API whose profile route is the standard
 * `PUT /api/user` reading `{ user: … }` needs only the request fields:
 *
 * ```typescript
 * const client = createJWTAuthClient({
 *   profileEndpoint: '/api/user',
 *   profileUpdateMethod: 'PUT',
 *   profileRequestBody: (data) => ({ user: data }),
 * })
 * ```
 *
 * The profile write route is independent of `currentUserEndpoint` (which is a GET).
 * Configure all request fields for the API you own; changing the method/body does
 * not change the endpoint. A resource with an account-id route uses the same config:
 *
 * ```typescript
 * const client = createJWTAuthClient({
 *   currentUserEndpoint: '/accounts/current',
 *   profileEndpoint: (user) => `/accounts/${encodeURIComponent(user.id)}`,
 * })
 * ```
 *
 * The resolver receives the signed-in user before applying the submitted patch.
 * It requires a loaded user and never derives a write URL from the GET endpoint.
 *
 * That adapts the REQUEST only. Response mapping (`mapAuthResponse`), token and user storage,
 * subscriber notifications and the reload restore are the client's existing behavior — replacing
 * the client to change a method or an envelope also replaces the lifecycle that keeps a session
 * coherent, and hand-written adapters have had to repair those callbacks repeatedly.
 * A pending profile response is published only to the session that sent it:
 * signing out or explicitly adopting/signing in another session prevents the old
 * response from replacing the active user's stored profile.
 *
 * **A background verification that returns an unchanged user changes nothing.** When
 * `validateSession()` (or a reload's restore) answers with the same profile data the client
 * already holds, the client keeps the SAME user object and does not notify subscribers — so an
 * effect seeded from `user` does not re-run, and a form it fills keeps what has been typed.
 * In React, `useProfileForm` from `@molecule/app-react` also preserves dirty
 * fields when a background read contains changed user data, and owns partial
 * submission, the saved baseline and cache propagation. Use that composition
 * for editable account forms instead of resetting every field on `user` changes.
 *
 * **A token another tool reads at its own key is a CONFIG field, not a mirror.**
 * An e2e suite or host page that expects `localStorage.jwtToken` (the RealWorld
 * specs do) is satisfied by `tokenKey: 'jwtToken'` — in a browser the client's
 * storage default is already `createBrowserStorageAdapter()`, so with an explicit
 * `'memory'` store you must also pass
 * `storage: createBrowserStorageAdapter()`. Writing the token into that key from a
 * subscription beside the client is a second store. In React, `useAuth()` from
 * `@molecule/app-react` returns the client's `state` (with `status`), `user` and
 * `isAuthenticated`; the token is `useAuthClient().getAccessToken()`.
 *
 * **A store that registers its own gate must exempt the restore's own request.**
 * This client restores with `fetch`, so the gate registered over it never holds
 * the restore. A store that restores THROUGH the bonded HTTP client and
 * registers that restore as the gate (`setAuthGate(() => store.whenSettled())`)
 * waits on itself unless the restore's request passes `skipAuthGate: true` —
 * otherwise the gate holds the very request it is waiting for, and every
 * request it holds stalls until the gate times out. See
 * `RequestConfig.skipAuthGate` in `@molecule/app-http`.
 *
 * @remarks
 * - **An API with its own auth envelope keeps this client.** `requestBody` wraps the
 *   login/register payload (`(kind, p) => ({ user: p })`), `mapAuthResponse` reads the
 *   token and user out of the answer (`(d) => ({ accessToken: d.user.token, user: d.user })`),
 *   and `authScheme: 'Token'` sends `Authorization: Token <jwt>`. `mapAuthResponse` is the
 *   ONE user-shape adapter: the client applies it to every answer that carries a user (login,
 *   register, `validateSession()`, the cookie restore, a token refresh, `updateProfile()`), so
 *   the adapted profile survives a reload instead of being replaced by the raw wire user.
 *   Both are fields of the
 *   `AuthClientConfig` the client is CONSTRUCTED with
 *   (`setClient(createJWTAuthClient({ authScheme: 'Token', … }))` in the auth bond), not
 *   properties of a client that already exists. Do not hand-write an auth client for a spec
 *   like RealWorld. **Registration fields the base payload lacks (`username`, …) are the
 *   factory's second generic** — `createJWTAuthClient<UserProfile, { username: string }>(…)` —
 *   so `register({ username, email, password })` type-checks and the body goes out as
 *   `{ user: { username, email, password } }`. Do not pass them as `name`/`metadata` or
 *   cast the payload.
 * - **Endpoint defaults must match your API's real routes** (`/auth/login`,
 *   `/auth/register`, `/auth/refresh`, `/users/logout`, `/users/me`, …).
 *   Align them via `createJWTAuthClient({ baseURL, ...endpoints })` — never by
 *   hand-editing fetch calls in components.
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
 * An API that wraps the payload and registers extra fields (RealWorld): type those
 * fields with the factory's second generic, and `requestBody` receives exactly what
 * the form passed — `{ user: { username, email, password } }` goes out as-is.
 *
 * ```typescript
 * import type { UserProfile } from '@molecule/app-auth'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 *
 * const realWorldAuth = createJWTAuthClient<UserProfile, { username: string }>({
 *   baseURL: '/api',
 *   authScheme: 'Token',
 *   requestBody: (_kind, payload) => ({ user: payload }),
 *   mapAuthResponse: (data) => {
 *     const { user } = data as { user: { token: string; username: string; email: string } }
 *     return { accessToken: user.token, user: { id: user.username, email: user.email } }
 *   },
 * })
 *
 * await realWorldAuth.register({ username: 'alice', email: 'alice@example.com', password: 's3cret' })
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
 *   `AuthClientConfig.storage`: in a browser the client defaults to
 *   `createBrowserStorageAdapter()`, which keeps the token there; an httpOnly
 *   session cookie is restored by `initialize()` through `currentUserEndpoint`
 *   (default `/users/me`). If the app sets `storage: 'memory'` explicitly against
 *   an API that sets no cookie, this box cannot be checked, and the fix is the
 *   config, not a token store written beside the client.
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
