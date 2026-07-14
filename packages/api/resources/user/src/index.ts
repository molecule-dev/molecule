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
 * @example
 * ```ts
 * // Extend safely: a display field in Props, a secret in SecretProps.
 * //   propsSchema:       { …, timezone: z.string().optional() }           // safe → client
 * //   secretPropsSchema: { …, passwordResetToken: z.string().optional() } // server-only, secrets table
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

export * from './browser-guard.js'
export * as authorization from './authorization.js'
export * as authorizers from './authorizers/index.js'
export * as handlers from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './resource.js'
export * from './routes.js'
export * from './schema.js'
export * from './secrets.js'
export * as types from './types.js'
export * as utilities from './utilities/index.js'
