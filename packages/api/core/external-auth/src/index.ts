/**
 * External authentication interface for molecule.dev.
 *
 * Verifies a user token issued by an imported app's own auth platform
 * (Supabase, Firebase, Clerk, ...). Apps imported into molecule.dev usually
 * arrive with a working frontend auth flow — their users already hold session
 * tokens from that platform. This core is the server-side capability for
 * accepting those tokens: `verifyUserToken()` turns the token the frontend
 * already sends into a verified `{ userId, email }`, or `null` when it is
 * invalid or expired.
 *
 * Use `setProvider()` to wire the concrete implementation from the provider
 * bond matching the app's platform, such as
 * `@molecule/api-external-auth-supabase`.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { setProvider, verifyUserToken } from '@molecule/api-external-auth'
 * // Reads SUPABASE_URL + SUPABASE_ANON_KEY (public values — no service-role secret needed).
 * import { provider as supabaseAuth } from '@molecule/api-external-auth-supabase'
 *
 * // Startup: bond the provider matching the imported app's auth platform.
 * setProvider(supabaseAuth)
 *
 * const app = express()
 * // A protected route — verify the token the app's frontend already sends.
 * app.get('/api/me', async (req, res) => {
 *   const token = req.headers.authorization?.replace(/^Bearer /, '') ?? ''
 *   const user = await verifyUserToken(token) // null = invalid/expired/empty → 401, never 500
 *   if (!user) {
 *     res.status(401).json({ error: 'Invalid or expired session.' })
 *     return
 *   }
 *   res.json({ userId: user.userId, email: user.email })
 * })
 * app.listen(3000)
 * ```
 *
 * @remarks
 * **This is how you authenticate an IMPORTED app's existing users
 * server-side.** Do not hand-roll JWT verification against the vendor's API
 * or rebuild the app's auth from scratch — the provider bond matching the
 * app's platform does the vendor-specific work, and the app's frontend keeps
 * the login flow it already has.
 *
 * - A bad token is a normal runtime condition: `verifyUserToken()` resolves
 *   `null` for invalid/expired/empty tokens — map that to a 401, never a 500.
 * - `verifyUserToken()` THROWS only on a wiring/config bug, never for a bad
 *   token: when no provider is bonded (call `setProvider()` from the matching
 *   bond at startup), or when the bond is unconfigured — the Supabase bond
 *   throws if `SUPABASE_URL` / `SUPABASE_ANON_KEY` (or their `VITE_` variants)
 *   are missing. Let that surface as a server error, don't map it to 401.
 * - The verified `userId` is the external platform's stable user id — key
 *   your server-side records on it.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The provider bond matching the app's auth platform is wired with
 *   `setProvider()` at startup — no "No external-auth provider bonded" errors
 *   appear in server logs when hitting protected routes.
 * - [ ] Log in through the app's existing auth UI, then hit a protected API
 *   route: `verifyUserToken()` accepts the live session token and the route
 *   returns that user's data.
 * - [ ] The counterparty is the auth platform itself: obtain a REAL user token
 *   by signing up / logging in through the app's own UI (`interact_preview`)
 *   and exercise `verifyUserToken()` with the token the frontend sends —
 *   never fabricate, hand-mint, or replay a made-up token as a "valid" case.
 * - [ ] A garbage or expired Bearer token gets a clean 401 from protected
 *   routes (`verifyUserToken()` → `null`) — never a 500 or a crash.
 * - [ ] A request with no Authorization header is rejected as
 *   unauthenticated (401), not treated as a server error.
 * - [ ] Server-side records created for the logged-in user are keyed on the
 *   verified `userId`, and another user's token never reads them back.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
export * from './verify.js'
