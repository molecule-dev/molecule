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
 * ```typescript
 * import { setProvider, verifyUserToken } from '@molecule/api-external-auth'
 * import { configureSupabase, provider } from '@molecule/api-external-auth-supabase'
 *
 * // Startup: bond once. Both values are PUBLIC (the anon key ships in the browser bundle).
 * configureSupabase({
 *   url: process.env.SUPABASE_URL, // e.g. https://abcd1234.supabase.co
 *   anonKey: process.env.SUPABASE_ANON_KEY,
 * })
 * setProvider(provider)
 *
 * // In a route: verify the Supabase access token the frontend already sends.
 * const authorization = 'Bearer supabase-access-token'
 * const token = authorization.replace(/^Bearer /, '')
 * const user = await verifyUserToken(token) // { userId, email? } or null
 * if (!user) {
 *   console.warn('401: invalid or expired Supabase session')
 * } else {
 *   console.log(`signed in as ${user.userId} <${user.email ?? 'no email'}>`)
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
 * - `verifyUserToken()` returns `null` for an empty, invalid or expired token — but THROWS
 *   when no URL / anon key is configured (the error names the missing env vars). Each call
 *   is a network round-trip to Supabase Auth (`auth.getUser(token)`), not a local JWT check.
 * - Admin work goes through `getServiceClient()` only after `hasServiceRole()` returns
 *   `true` — it throws without `SUPABASE_SERVICE_ROLE_KEY`, and it bypasses Row Level
 *   Security. `configureSupabase()` merges settings, so `configureSupabase({ serviceRoleKey })`
 *   can be called later on its own.
 *
 * @see https://www.npmjs.com/package/@supabase/supabase-js
 *
 * @module
 */

export * from './browser-guard.js'
export * from './client.js'
export * from './config.js'
export * from './provider.js'
export * from './types.js'
