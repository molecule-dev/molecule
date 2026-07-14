/**
 * External authentication provider using Supabase — first-class support for
 * apps imported into molecule.dev that were built on Supabase (Lovable and
 * similar).
 *
 * Implements the `@molecule/api-external-auth` contract: the exported
 * `provider` verifies a user's Supabase JWT server-side via the anon client's
 * `auth.getUser(token)`. Two tiers:
 *
 * - **No-secret tier** (works out of the box): token verification and
 *   RLS-constrained PostgREST access via `getAnonClient()` — both using only
 *   the PUBLIC anon key (`SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` /
 *   `VITE_SUPABASE_PUBLISHABLE_KEY`). No secret required.
 * - **Connected tier**: once the user supplies `SUPABASE_SERVICE_ROLE_KEY`,
 *   `getServiceClient()` returns an admin client that bypasses Row Level
 *   Security. Gate every admin path with `hasServiceRole()`.
 *
 * Settings come from `configureSupabase()` or, lazily at first client
 * creation, from env: `SUPABASE_URL` ?? `VITE_SUPABASE_URL`,
 * `SUPABASE_ANON_KEY` ?? `VITE_SUPABASE_ANON_KEY` ??
 * `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
 * `resetSupabase()` clears cached clients + settings (test hook).
 *
 * @example
 * ```ts
 * // bonds.ts — wire the provider at startup:
 * import { setProvider } from '@molecule/api-external-auth'
 * import { provider } from '@molecule/api-external-auth-supabase'
 *
 * setProvider(provider)
 *
 * // Then server routes verify the token the frontend already sends:
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
 * @example
 * ```ts
 * // Admin operations need the service-role key — ALWAYS gate on hasServiceRole():
 * import { getServiceClient, hasServiceRole } from '@molecule/api-external-auth-supabase'
 *
 * if (hasServiceRole()) {
 *   const admin = getServiceClient()
 *   await admin.from('profiles').update({ suspended: true }).eq('id', targetId)
 * } else {
 *   // Degrade: store the flag in the provisioned DATABASE_URL Postgres,
 *   // or ask the user to connect SUPABASE_SERVICE_ROLE_KEY in the
 *   // Environment panel.
 * }
 * ```
 *
 * @remarks
 * - The anon key is PUBLIC (it ships in the browser bundle of every Supabase
 *   app) — `provider.verifyUserToken()` and `getAnonClient()` need NO secret.
 *   Do not treat a missing service-role key as "Supabase is unusable".
 * - `SUPABASE_SERVICE_ROLE_KEY` is NOT provisioned in molecule sandboxes and
 *   never will be by default. Check `hasServiceRole()` and degrade gracefully
 *   or ask the user to connect it in the Environment panel — never assume it
 *   exists. Migrations/DDL against the user's hosted Supabase database cannot
 *   run from the sandbox.
 * - New server-side tables belong in the provisioned `DATABASE_URL` Postgres,
 *   NOT in the user's hosted Supabase — unless the user has connected
 *   Supabase credentials that allow it.
 * - This package is SERVER-ONLY. It throws immediately if bundled into
 *   browser/client code — import it only from server code, and never polyfill
 *   `Buffer`/`process` to silence the guard.
 *
 * @see https://www.npmjs.com/package/@supabase/supabase-js
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
export * from './config.js'
export * from './client.js'
