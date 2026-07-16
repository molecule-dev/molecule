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
 * - **A page reload "logging the user out" is the config default, not a bug.**
 *   Token storage defaults to `'memory'` (the secure default — a localStorage
 *   bearer token is XSS-exfiltratable). Staying signed in across reloads works
 *   by calling `client.initialize()` once at startup: it re-fetches
 *   `currentUserEndpoint` (default `/users/me`) with the httpOnly cookie the
 *   API set at login. Wire `initialize()`; do NOT "fix" reload-logout by
 *   copying tokens into localStorage.
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
 * - [ ] The session survives a FULL page reload: after login, hard-reload →
 *   `initialize()` restores it from the httpOnly cookie (via
 *   `currentUserEndpoint`, default `/users/me`) and you stay signed in — you are
 *   NOT bounced to login. (The in-memory bearer token is dropped by design; the
 *   cookie restore is what keeps you in — do not "fix" this by writing the token
 *   to localStorage.)
 * - [ ] Password reset round-trips: `requestPasswordReset({ email })` then
 *   `confirmPasswordReset({ token, password })` with the emailed token, after
 *   which `login()` with the NEW password succeeds and the OLD password no
 *   longer works.
 * - [ ] Authorization holds: a signed-in user only ever reads/edits their OWN
 *   record (`getUser()` is the caller's profile, never another user's); the
 *   bearer token lives in memory only — it is never written to
 *   localStorage / sessionStorage where another script could read it; and an
 *   expired/invalid token fails closed — the app re-authenticates (`refresh()`
 *   or `logout()`), never silently serving another user's data.
 *
 * @module
 */

export * from './client.js'
export * from './provider.js'
export * from './token.js'
export * from './types.js'
export * from './utilities.js'
