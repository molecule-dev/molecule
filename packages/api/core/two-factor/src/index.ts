/**
 * Two-factor authentication interface for molecule.dev.
 *
 * Provides an abstract two-factor authentication interface that can be
 * backed by any TOTP library. Use `setProvider` to provide a concrete
 * implementation such as `@molecule/api-two-factor-otplib`.
 *
 * @remarks
 * **The TOTP secret is a SERVER-SIDE secret — it must NEVER reach the browser.**
 * `generateSecret()`, `getUrls()`, and `verify()` all run in YOUR API. The secret
 * lives only in the server + your database. The frontend sends a 6-digit token and
 * receives a boolean (or, once, the enrollment QR); it must NEVER receive, store, or
 * send the raw secret, and must NEVER read or write the 2FA table directly.
 *
 * **The API OWNS the full lifecycle and state** (secret + `enabled` flag +
 * `last_time_step`). `verify()` is stateless on purpose — YOU load the stored secret
 * server-side and pass it in; do not accept a secret from the client. Expose these
 * endpoints so the frontend never needs the database:
 *
 * - `GET  /2fa/status`  → `{ enabled }`, read from YOUR store. (This is the call a
 *   frontend most often wrongly points at the DB — keep it on the API.)
 * - `POST /2fa/setup`   → `generateSecret()`, store it server-side as PENDING
 *   (`enabled:false`), and return ONLY `getUrls()`'s `{ keyUrl, QRImageUrl }` — the QR
 *   carries the secret to the user's authenticator app; you never hand the raw secret
 *   to the browser to persist.
 * - `POST /2fa/enable`  → `verify()` the token against the PENDING secret; on success
 *   set `enabled:true` and persist `timeStep`.
 * - `POST /2fa/verify`  → `verify()` a login token against the STORED secret you load
 *   server-side; the browser sends only the token.
 * - `POST /2fa/disable` → clear the secret + `enabled` server-side.
 *
 * Persist {@link TwoFactorVerifyResult.timeStep} and pass it back as
 * {@link TwoFactorVerifyParams.afterTimeStep} on the next `verify()` for single-use
 * replay protection.
 *
 * **Adding 2FA to an app that has its OWN hosted database (Supabase / Firebase):** store
 * the 2FA state in the MOLECULE-provisioned database — `DATABASE_URL` (Postgres) is in the
 * sandbox env and `@molecule/api-database` is installed — NOT the app's Supabase/Firebase
 * ADMIN (service-role) client. That admin secret (e.g. `SUPABASE_SERVICE_ROLE_KEY`) is NOT
 * provisioned in the molecule environment — only the app's public/anon key is — so a
 * server-side `supabaseAdmin` / Firebase-admin write fails with "missing env var … Connect
 * Supabase in Lovable Cloud". Put the `user_2fa` table in the molecule DB, keyed by the
 * app's user id. (Still route EVERY 2FA read AND write through the server — a direct
 * `supabase.from('user_2fa')` from the BROWSER exposes the secret; a leftover client-side DB
 * call is a bug, not a shortcut.)
 *
 * @example
 * ```ts
 * import { Router } from 'express'
 * import { generateSecret, getUrls, verify } from '@molecule/api-two-factor'
 * // `store` = YOUR server-side persistence: the molecule DB via `@molecule/api-database`
 * // (or a `pg` pool on `DATABASE_URL`) — for an imported app too, NOT its Supabase
 * // service-role client. Keyed by user id; the browser never touches it.
 * const router = Router()
 *
 * router.get('/status', async (_req, res) => {
 *   const rec = await store.get(userId)
 *   res.json({ enabled: !!rec?.enabled }) // a boolean — never the secret
 * })
 *
 * router.post('/setup', async (_req, res) => {
 *   const secret = generateSecret()
 *   await store.upsert(userId, { secret, enabled: false }) // pending, server-side only
 *   const { keyUrl, QRImageUrl } = getUrls({ username, service: 'MyApp', secret })
 *   res.json({ keyUrl, QRImageUrl }) // the QR carries the secret — never return it raw
 * })
 *
 * router.post('/enable', async (req, res) => {
 *   const rec = await store.get(userId)
 *   const { valid, timeStep } = verify({
 *     secret: rec.secret, token: req.body.token, afterTimeStep: rec.last_time_step,
 *   })
 *   if (!valid) return res.status(400).json({ error: 'Invalid code' })
 *   await store.upsert(userId, { enabled: true, last_time_step: timeStep })
 *   res.json({ enabled: true })
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
