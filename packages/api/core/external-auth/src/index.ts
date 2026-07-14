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
 * ```ts
 * // bonds.ts — wire the provider matching the imported app's auth platform:
 * import { setProvider } from '@molecule/api-external-auth'
 * import { provider } from '@molecule/api-external-auth-supabase'
 *
 * setProvider(provider)
 * ```
 *
 * @example
 * ```ts
 * // A protected server route — verify the token the frontend already sends:
 * import { verifyUserToken } from '@molecule/api-external-auth'
 *
 * app.get('/api/me', async (req, res) => {
 *   const token = req.headers.authorization?.replace(/^Bearer /, '') ?? ''
 *   const user = await verifyUserToken(token)
 *   if (!user) {
 *     res.status(401).json({ error: 'Invalid or expired session.' })
 *     return
 *   }
 *   res.json({ userId: user.userId, email: user.email })
 * })
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
 * - `verifyUserToken()` THROWS only when no provider is bonded — that is a
 *   wiring bug: call `setProvider()` from the matching bond at startup.
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
