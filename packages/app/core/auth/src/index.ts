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
 * @module
 */

export * from './client.js'
export * from './provider.js'
export * from './token.js'
export * from './types.js'
export * from './utilities.js'
