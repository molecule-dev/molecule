/**
 * The `user` resource types, schema, and definition.
 *
 * @remarks
 * The user record is split across TWO schemas — pick the right one or you leak credentials:
 * - **{@link Props} (`propsSchema`)** — SAFE, client-facing fields (username, name, email,
 *   `emailVerified`, `twoFactorEnabled`, plan). This is what handlers return and what lives
 *   in the `users` table.
 * - **{@link SecretProps} (`secretPropsSchema`)** — SERVER-ONLY secrets: `passwordHash`, the
 *   TOTP `twoFactorSecret` (and its pending-setup value). Stored in a SEPARATE secrets table
 *   and NEVER serialized to the client. Note the pair `twoFactorEnabled` (safe boolean, in
 *   `Props`) vs `twoFactorSecret` (secret, in `SecretProps`).
 *
 * When you extend the user, put a secret (token, hash, key, provider refresh token) in
 * `SecretProps`; put a display field in `Props`. **Never add a secret to `Props`, never
 * return a secrets-table value in a response or log, and never `res.json(userRow)` a raw DB
 * row** — return `Props`.
 *
 * Auth is ALREADY wired globally (the router's `verifyMiddleware` → `res.locals.session`),
 * so a handler reads the current user with `getUserId(res)` and does NOT add per-route auth
 * middleware (see the `auth` skill). Scope every custom user query by the authenticated id.
 *
 * On the CLIENT, the bearer token is held IN MEMORY only — a `localStorage` copy is
 * XSS-exfiltratable and is forbidden. The session is restored after a reload via the
 * httpOnly cookie + `GET /users/me`; don't persist the token yourself.
 *
 * **Client-facing endpoints** (mounted under the app's `/api` prefix → `/api/users/...`).
 * The auth CLIENT (`useAuth()` → `login` / `register` / `logout` / `refresh`) already wraps
 * login / signup / logout — do NOT hand-roll those against the raw routes. The rest have NO
 * client method; call them with raw `http.*`. Use these EXACT paths — a weak model guesses
 * `/api/auth/*` or `/api/user` (singular), and neither exists:
 * - `POST   /api/users/forgot-password` — request a reset email (body `{ email }`)
 * - `POST   /api/users/reset-password` — confirm with the emailed token (body `{ token, password }`)
 * - `PATCH  /api/users/:id` — update profile fields (name, username, email, bio); NOT `PUT /api/user`
 * - `PATCH  /api/users/:id/password` — change password · `DELETE /api/users/:id` — delete account
 * - `PATCH  /api/users/:id/plan` — update the subscription plan (a paid plan with no
 *   existing subscription answers 201 `{ checkoutUrl }`; send the browser there)
 * - `POST   /api/users/:id/verify-payment/:provider` — confirm a purchase server-side
 *   (body/query `subscriptionId`); the provider returns the buyer to the APP's
 *   `/plan-updated?provider=…&sessionId=…`, and THAT page calls this from the app
 *   origin so the session cookie applies. A hosted checkout must never redirect
 *   straight to this route on a separate API host: the top-level navigation carries
 *   no credentials, so it answers 401 and the paid plan is never granted.
 * - `POST   /api/users/:id/billing-portal/:provider` — open the provider's hosted
 *   billing portal (update card, invoices, cancel); responds `{ url }`, optional body
 *   `{ returnPath }` to come back to a specific app page. 404 `user.payment.noBillingAccount`
 *   when the user has no customer record yet
 * - `GET    /api/users/me` — the current user (session restore) · `GET /api/users/:id` — read one
 * The full, authoritative route list is the `routes` export (see `routes.ts`).
 *
 * Extending the user: a display field goes in `propsSchema` (e.g. `timezone`), a secret in
 * `secretPropsSchema` (e.g. `passwordResetToken`). A custom handler reads the id with
 * `getUserId(res)` and returns `Props` only — never spread a secrets-table row into a response.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import {
 *   mountDefaultUserAuthRoutes,
 *   mountDefaultUserCrudRoutes,
 *   setupJwtJsonwebtoken,
 *   setupPasswordBcrypt,
 *   setupServiceDevice,
 * } from '@molecule/api-bonds-default-express'
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { createRequestHandler } from '@molecule/api-resource'
 * import { authorization, createRequestHandlerMap } from '@molecule/api-resource-user'
 *
 * // Startup: every one of these is REQUIRED for signup/login (an mlcl scaffold already does it).
 * setStore(store) // users + usersSecrets + devices tables (reads DATABASE_URL)
 * setupServiceDevice() // bond('device', …) — a session is a (userId, deviceId) pair
 * setupJwtJsonwebtoken() // session JWTs from JWT_PRIVATE_KEY / JWT_PUBLIC_KEY
 * setupPasswordBcrypt() // password hashing
 *
 * // The handler map is a FACTORY. verifyMiddleware() sets res.locals.session for every route.
 * const User = createRequestHandlerMap(createRequestHandler)
 * export const router = express.Router()
 * router.use(authorization.verifyMiddleware())
 * mountDefaultUserAuthRoutes(router, User) // POST /users, /users/log-in, /users/logout, /users/forgot-password
 * mountDefaultUserCrudRoutes(router, User) // GET /users/me, GET/PATCH/DELETE /users/:id
 *
 * // Signup: POST /users { username: 'ada', email: 'ada@example.com', password: 'correct horse' }
 * //   → 201 { user: { id, username, email, … }, accessToken } (+ httpOnly session cookies)
 * // Login:  POST /users/log-in { email, password } → 200 { user, accessToken }
 * // Restore: GET /users/me with `Authorization: Bearer <accessToken>` (or the cookie) → 200 { props }
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A new user can sign up with email + password and lands authenticated (the
 *   UI reflects the signed-in user, e.g. their name/menu appears).
 * - [ ] Any flow that emails a link/code (signup verification, password reset)
 *   round-trips: the sandbox CAPTURES the message instead of sending — read it
 *   with the `read_activity` tool (filter type 'email') and follow the link/code
 *   in its payload; never mock the flow or modify production code to expose it.
 * - [ ] Logging out and logging back in with the same credentials reaches the same
 *   account and its data.
 * - [ ] The session survives a full page reload (restored via the httpOnly cookie +
 *   `GET /users/me` — never from a token persisted in localStorage).
 * - [ ] A wrong password shows a visible error and does NOT authenticate.
 * - [ ] Authenticated-only screens are unreachable when logged out (redirect to
 *   login or an explicit denial — never a blank page).
 * - [ ] A profile/account edit (e.g. display name) persists across a reload.
 *
 * @module
 */

export * as authorization from './authorization.js'
export * as authorizers from './authorizers/index.js'
export * from './browser-guard.js'
export * as handlers from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './resource.js'
export * from './routes.js'
export * from './schema.js'
export * from './secrets.js'
export * as types from './types.js'
export * as utilities from './utilities/index.js'
