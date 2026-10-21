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
 * **Table setup:** `src/__setup__/users.sql` + `src/__setup__/usersSecrets.sql`; an mlcl-scaffolded API replays `__setup__/*.sql` on migrate.
 *
 * **`usersSecrets.id` IS the user's id — the value of `users.id`, never a fresh uuid.** The DDL
 * declares it `UNIQUE PRIMARY KEY` with no foreign key, so nothing enforces it: a row written
 * under another id is never found again — login answers "invalid credentials" while
 * `GET /api/users/me` still answers 200. A hand-written signup writes both rows:
 * `const id = uuid(); await create('users', { ...props, id }); await create('usersSecrets', { id, passwordHash: await hash(password) })`.
 *
 * Prefer not to hand-write that — `handlers.create` (signup: both rows, hash via
 * `@molecule/api-password`, session device), `handlers.logIn` (reads `usersSecrets` by the user's
 * id), `handlers.updatePassword`, `handlers.forgotPassword` / `handlers.resetPassword`. To touch
 * one secret yourself use the datastore on the same key — `findById('usersSecrets', userId)` (or
 * `${tableName}Secrets` for a custom `tableName`) — never SQL.
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
 * STRING, not to a row. `set()` throws when `deviceId` is missing rather than mint a token every
 * later request answers 401.
 *
 * **RealWorld-style token API (`Authorization: Token <jwt>`)? CONFIGURATION on this same auth
 * path — never a credentials table of your own** (`usersSecrets.passwordHash` is the password
 * store). Set `AUTH_SCHEME=Token` (or `verifyMiddleware({ scheme: 'Token' })`): every route
 * accepts it, `logIn`/`create` return `accessToken`, `GET /users/me` echoes it, and a password
 * change revokes every OTHER device but keeps the caller's own session.
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
 * **Re-shaping a success answer (RealWorld's `{ user: { …, token } }`, say)? Read the token from
 * `result.body.accessToken` — it is in the BODY.** The `Authorization` response header carries
 * the same token prefixed with the mount's scheme (`Bearer <token>`), so it is not the raw value
 * a client sends back. Type the result from the handler — do not cast `body` to `unknown`, which
 * hides the success branch — and narrow on the body's own keys:
 *
 * ```typescript
 * const result = await handlers.logIn(resource)(req, res)
 * if (!('accessToken' in result.body)) {
 *   // 400/403/500 `{ error, errorKey }`, or 206 `{ twoFactorRequired: true }` — send as built.
 *   res.status(result.statusCode).send(result.body)
 *   return
 * }
 * // `props` and `user` are the SAFE columns (secret columns stripped); accessToken is the token.
 * const { props, accessToken } = result.body
 * res.status(200).json({ user: { ...props, token: accessToken } })
 * ```
 *
 * **Constructing a handler: `schema` is optional.** Every factory accepts
 * `{ name, tableName, schema? }`. `schema` is a Zod object (anything exposing `safeParse`)
 * and only `handlers.create` / `handlers.logInOAuth` use it — both default to this package's
 * `propsSchema`. `handlers.update` validates with its own update schema; login and the
 * read/write handlers never validate props. The smallest correct wiring, with every import
 * spelled out:
 *
 * ```typescript
 * import { createRequestHandler } from '@molecule/api-resource'
 * import { createResource, handlers } from '@molecule/api-resource-user'
 *
 * // Omit `schema`: create() validates new users with this package's propsSchema.
 * const signUp = createRequestHandler(handlers.create({ name: 'User', tableName: 'users' }))
 * const signIn = createRequestHandler(handlers.logIn({ name: 'User', tableName: 'users' }))
 *
 * // A constrained schema, when the app restricts oauthServer / planKey.
 * const users = createResource({ oauthServers: ['google', 'github'] as const })
 * const signUpConstrained = createRequestHandler(handlers.create(users))
 * ```
 *
 * `schema: {}` (or any object without `safeParse`) is NOT a schema: the first request
 * answers 400 `resource.error.unknownError` with
 * `TypeError: schema.safeParse is not a function`, and no row is written. Omit `schema`
 * instead of stubbing it.
 *
 * **Exact responses of the sign-up and sign-in handlers** (the body shapes the routes send;
 * a handler returns `{ statusCode, body }` and the mount applies it):
 * - `create` (`POST /api/users`, flat body): 201 `{ props, accessToken, user }` (`user` equals
 *   `props`, secret columns stripped); 400 `user.error.usernameInvalid` /
 *   `user.error.bodyNestedUnderUser` / `user.error.passwordRequired` /
 *   `user.error.passwordTooLong` / `user.error.passwordTooShort` / `user.error.emailInvalid` /
 *   `user.error.badRequest`, or `resource.error.unknownError` when props fail the schema;
 *   403 `user.error.usernameUnavailable` / `user.error.emailAlreadyRegistered`;
 *   500 `user.error.failedToHashPassword` / `user.error.failedToCreateSession`.
 * - `logIn` (`POST /api/users/log-in`): 200 `{ props, accessToken, user }`; 206
 *   `{ twoFactorRequired: true }`; 403 `user.error.invalidCredentials` /
 *   `user.error.invalidTwoFactorToken`; 500 `user.error.failedToCreateSession` /
 *   `user.error.twoFactorVerificationUnavailable` / `user.error.loginFailed`. Bad credentials
 *   are 403, not 401 or 422.
 *
 * **A JWT you sign yourself is NOT a session.** `verifyMiddleware` accepts a token only when
 * the bonded `@molecule/api-jwt` provider verifies it AND its `deviceId` names an ACTIVE row
 * in `devices`; anything else — another secret or algorithm, or an invented/placeholder
 * `deviceId` — is answered 401 on every request (a request with no credential at all answers
 * `{"errors":{"token":["is missing"]}}`). Mint sessions with `authorization.set()` after
 * `device.createOrUpdate()` (the sequence above) and mount `verifyMiddleware` once in front of
 * the routes — never hand-roll auth middleware or a second token scheme.
 *
 * **Changing the EMAIL or the PASSWORD requires the CURRENT password — there is no opt-out.**
 * `handlers.update` (`PATCH /users/:id`) takes profile fields; when the body changes (or
 * clears) `email` on an account that has a password, the SAME flat body must also carry that
 * account's `currentPassword`. Missing → 400 `user.error.currentPasswordRequired`; wrong → 403
 * `user.error.currentPasswordIncorrect`. A real change resets `emailVerified` to `false`
 * server-side (the new address is unproven), and `emailVerified` is NEVER read from the body.
 * An OAuth-only account (no `passwordHash`) has no password to present, so its provider-backed
 * session is the credential. `handlers.updatePassword` (`PATCH /users/:id/password`) requires
 * `newPassword` (8–1024 characters) and, on a password account, `currentPassword` as well —
 * same 400/403 codes; it answers 200 `{ success: true }`, clears any outstanding reset token,
 * and revokes every OTHER device while the caller's own session keeps working.
 *
 * Do NOT work around either gate by storing, caching or replaying the user's password, by
 * sending an invented `currentPassword`, or by writing `email` around the handler with the
 * datastore: the password is the re-authentication factor that stops a hijacked session from
 * moving the account-recovery address. If a wire format (e.g. RealWorld's token-only
 * `PUT /user`) cannot collect the current password, that flow is simply unsupported as written
 * — have the client ask for it in a re-authentication step, or route sign-in and account
 * changes through the auth pages (`useAuth()`). There is no supported bypass to add.
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
 * **The RealWorld token recipe (detail).** The scheme is configuration, not a second auth
 * layer: `AUTH_SCHEME=Token` in the API's env, or `verifyMiddleware({ scheme: 'Token',
 * allowCookieSession: false })` at the mount, makes every covered route accept
 * `Authorization: Token <jwt>` (`Bearer` stays accepted too) and labels the sign-in response
 * header with that scheme. The token is already in the body — `handlers.logIn` and
 * `handlers.create` return `{ props, accessToken, user }`, and `GET /users/me` adds
 * `accessToken` when the request authenticated with the header (never for a cookie-resolved
 * session: that token must stay unreadable to JavaScript).
 *
 * ```typescript
 * // Token-only API that speaks RealWorld's scheme.
 * router.use(verifyMiddleware({ scheme: 'Token', allowCookieSession: false }))
 * // POST /users and POST /users/log-in answer { props, accessToken, user };
 * // clients send `Authorization: Token <accessToken>` from then on.
 * ```
 *
 * The CLIENT labels its header the same way: `authScheme: 'Token'` is an option of the HTTP
 * client's CONSTRUCTOR (`createFetchClient({ baseURL, authScheme: 'Token' })`, or the axios
 * provider's `createAxiosClient`), never a property of `getClient()`'s result.
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
