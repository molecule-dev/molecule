/**
 * The `user` resource types, schema, and definition.
 *
 * **This package owns TWO tables, and the key that joins them is the user's own id.**
 * - `users` — {@link Props}: `id`, `username`, `name`, `email`, `emailVerified`, `avatar`,
 *   `bio`, `twoFactorEnabled`, the `oauth*` and `plan*` columns. **There is no password column
 *   here.**
 * - `usersSecrets` — {@link SecretProps}: `passwordHash`, `passwordResetToken` (and
 *   `passwordResetTokenAt`), `twoFactorSecret` / `pendingTwoFactorSecret`, `lastTwoFactorTimeStep`.
 *
 * **Table setup:** `src/__setup__/users.sql` + `src/__setup__/usersSecrets.sql`; an mlcl-scaffolded API replays `__setup__/*.sql` on migrate, anywhere else run them once.
 *
 * **`usersSecrets.id` IS the user's id — the value of `users.id`, never a fresh uuid.** The DDL
 * declares it `UNIQUE PRIMARY KEY` with no foreign key, so nothing enforces the pairing: a row
 * written under another id is never found again — login answers "invalid credentials" while
 * `GET /api/users/me` (which reads `users` only) still answers 200. A hand-written signup writes
 * both rows from one id:
 * `const id = uuid(); await create('users', { ...props, id }); await create('usersSecrets', { id, passwordHash: await hash(password) })`.
 *
 * Prefer not to hand-write any of that: the handlers this package ships already do it —
 * `handlers.create` (signup: writes both rows, hashes with `@molecule/api-password`, mints the
 * session device), `handlers.logIn` (login: reads `usersSecrets` by the user's id and compares the
 * hash), `handlers.updatePassword`, and `handlers.forgotPassword` / `handlers.resetPassword` (the
 * emailed-token reset). To read or write one secret yourself, use the abstract datastore on the
 * same key — `findById('usersSecrets', userId)`, or `${tableName}Secrets` when the resource
 * carries a custom `tableName` — never SQL.
 *
 * **Issuing a session yourself (the sequence is device, then session — two calls, and the first
 * RETURNS the id):** the middleware accepts both `Authorization: Bearer <jwt>` and
 * `Authorization: Token <jwt>` (RealWorld's scheme), but only for a token whose `deviceId` names
 * an ACTIVE row in `devices` — a JWT you `sign()` with an invented `deviceId` is answered 401 on
 * every route.
 *
 * ```typescript
 * import { get } from '@molecule/api-bond'
 * import { authorization } from '@molecule/api-resource-user'
 * import type { DeviceService } from '@molecule/api-resource-device'
 *
 * const deviceId = await get<DeviceService>('device')?.createOrUpdate(userId, deviceName)
 * const token = authorization.set(req, res, { userId, deviceId })
 * ```
 *
 * `get<DeviceService>('device')` is the typed accessor (never hand-type a
 * `get<{ createOrUpdate(): … }>('device')` generic: a wrong one still compiles and leaves the
 * field you invented — `device.id` — `undefined`), and `createOrUpdate` RESOLVES TO THE DEVICE ID
 * STRING, not to a row. `authorization.set()` throws when `deviceId` is missing rather than mint a
 * token every later request answers 401.
 *
 * **`handlers.*` return `{ statusCode, headers?, body }` and never write to `res`** — not through
 * `res.json`, not through `res.send`, not through `res.end`. The mounted routes apply that object
 * for you (`createRequestHandler` does `res.set(headers)`, `res.status(statusCode)`,
 * `res.send(body)`); calling a handler directly is only correct if you apply the result yourself:
 *
 * ```typescript
 * const { statusCode, headers, body } = await handlers.logIn(resource)(req, res)
 * if (headers) res.set(headers)
 * res.status(statusCode).send(body)
 * ```
 *
 * Monkey-patching `res.json` to re-shape a handler's answer intercepts nothing the handler
 * produces, so the request it was meant to answer is left unanswered and hangs.
 *
 * @remarks
 * The user record is split across TWO schemas — pick the right one or you leak credentials:
 * - **{@link Props} (`propsSchema`)** — SAFE, client-facing fields (username, name, email,
 *   `emailVerified`, `twoFactorEnabled`, plan). This is what handlers return and what lives
 *   in the `users` table.
 * - **{@link SecretProps} (`secretPropsSchema`)** — SERVER-ONLY secrets: `passwordHash`, the
 *   TOTP `twoFactorSecret` (and its pending-setup value). Stored in the SEPARATE `usersSecrets`
 *   table (keyed by `id` = the user's id) and NEVER serialized to the client. Note the pair
 *   `twoFactorEnabled` (safe boolean, in `Props`) vs `twoFactorSecret` (secret, in `SecretProps`).
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
 * **A different wire format** (RealWorld's `{ user: { … } }`): the route handlers read a
 * FLAT body (`req.body.username`, `req.body.password`) and are not a wire-format adapter —
 * a nested body is answered 400 `user.error.bodyNestedUnderUser`. Unwrap the envelope
 * before calling a handler, or write the route yourself. A username keeps exactly what was
 * sent (letters, digits, `.`, `-`, `_`); anything else is answered 400
 * `user.error.usernameInvalid`, never rewritten.
 *
 * **A token-only JSON API:** by default the `token` cookie that login sets IS a session,
 * and `authorization.set()` writes it on every sign-in — so a client that keeps a cookie
 * jar (an HTTP test runner, `curl -b`) stays signed in on a request that sends no
 * `Authorization` header, and gets 200 on the step the suite calls "no auth". Mount
 * `verifyMiddleware({ allowCookieSession: false })` for an API whose clients send the
 * header: that ONE option turns the cookie off in BOTH directions — the middleware no
 * longer resolves a session from it (nor keeps one an earlier, laxer mount resolved), and
 * `set()` stops writing `token` / `sessionId` / `mol_auth`, so even the sign-in response
 * carries the `Authorization` header alone and the jar never fills. Set it on the mount in
 * front of the routes that sign users in — the scaffold's `api/src/App/router.ts` — and
 * check for a SECOND one: a request can pass several mounts (`api/src/server.ts`'s
 * `preApiRouter` runs before `App/router.ts` and covers all of `/api`), the last one it
 * passes sets the policy both halves read, and a laxer mount later in the chain cannot
 * re-admit the cookie. If the app mounts two, mount it once instead.
 *
 * **Revoking a session yourself:** the middleware caches "this device exists" for 10 s per
 * process, so a hand-written logout that deletes the `devices` row keeps authorizing that
 * token until the cache expires — a check right after logout still answers 200. Call
 * `invalidateDeviceExistsCache(deviceId)` (or `invalidateAllDeviceExistsCache()`) after the
 * delete; the built-in log-out route already does.
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
 * @example
 * ```ts
 * // Extend safely: a display field in Props, a secret in SecretProps.
 * //   propsSchema:       { …, timezone: z.string().optional() }           // safe → client
 * //   secretPropsSchema: { …, passwordResetToken: z.string().optional() } // server-only, usersSecrets
 *
 * // A custom handler returns SAFE props — never the secrets row.
 * router.get('/me/timezone', async (req, res) => {
 *   const userId = getUserId(res)
 *   if (!userId) return res.status(401).json({ error: 'Authentication required.' })
 *   const user = await findById('users', userId) // the users table holds Props only
 *   res.json({ timezone: user?.timezone })        // never spread a secrets-table row here
 * })
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
