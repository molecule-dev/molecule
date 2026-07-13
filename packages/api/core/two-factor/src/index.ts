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
 * **E2E verification — how to PROVE this integration works (do this before calling it done).**
 * Drive the app's REAL UI as the user would (in molecule.dev: `navigate_preview` →
 * `read_preview_ui` → `interact_preview`, targeting elements by `data-mol-id`), asserting each
 * expected outcome:
 *
 * 1. Sign UP + log in through the real auth screens (proves auth still works after your edits —
 *    the most common 2FA-integration regression is a broken login).
 * 2. Open the security/settings screen → activate "Set up 2FA" → a QR code / secret key is
 *    VISIBLE. (An error state here means the server-side setup route or table is broken.)
 * 3. Enter a REAL TOTP code computed from the enrollment secret (never a made-up `000000` —
 *    that one must FAIL) → status flips to enabled.
 * 4. Log out, log back in → the 2FA challenge appears after the password → a valid code
 *    completes login; a wrong code is rejected with a clear error.
 * 5. Disable 2FA from settings → log out/in again → no challenge.
 *
 * Any step showing an error state or a missing element IS the bug — fix the root cause and
 * re-drive. Also keep a real-path integration test in the repo (second example below) so the
 * lifecycle stays covered on every later build.
 *
 * **Adding 2FA to an app that already has its OWN backend/database:** persist the 2FA record
 * in YOUR server-side datastore — the state (secret + `enabled`) has to live somewhere the
 * server controls. Do NOT assume the imported app's own hosted-DB ADMIN credentials are
 * available: an imported repo ships only its public/client config, so a server-side admin write
 * to the app's external database fails at runtime with a "missing env var". Use whatever
 * server-side datastore the ENVIRONMENT actually provides — in the molecule sandbox that's the
 * provisioned `DATABASE_URL` (`@molecule/api-database` or a `pg` pool) — keyed by the app's user
 * id. (Still route EVERY 2FA read AND write through the server — a direct read/write of the 2FA
 * table from the BROWSER exposes the secret; a leftover client-side DB call is a bug.)
 *
 * @example
 * ```ts
 * import { Router } from 'express'
 * import { generateSecret, getUrls, verify } from '@molecule/api-two-factor'
 * // `store` = YOUR server-side persistence: the datastore the environment provides (in
 * // molecule, `DATABASE_URL` via `@molecule/api-database` or a `pg` pool) — NOT an imported
 * // app's own hosted-DB admin client. Keyed by user id; the browser never touches it.
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
 * @example
 * ```ts
 * // Real-path integration test (vitest) — the regression layer that keeps the 2FA lifecycle
 * // working on every later build. Real provider, real datastore, NO mocks. Computing a real
 * // TOTP from the enrollment secret is what catches a broken verify(); asserting a wrong code
 * // REJECTS is what catches a verify() that always returns true.
 * import { authenticator } from 'otplib' // or any TOTP lib the app already has
 * import { expect, test } from 'vitest'
 *
 * import { generateSecret, setProvider, verify } from '@molecule/api-two-factor'
 * import { provider } from '@molecule/api-two-factor-otplib'
 *
 * setProvider(provider)
 *
 * test('2FA lifecycle: setup → enable → verify → wrong code rejects', async () => {
 *   const userId = `test-user-${Date.now()}`
 *   const secret = generateSecret()
 *   await store.upsert(userId, { secret, enabled: false })        // pending, like /setup
 *
 *   const code = authenticator.generate(secret)                   // a REAL code
 *   const enable = verify({ secret, token: code })
 *   expect(enable.valid).toBe(true)                               // fails here if wiring is broken
 *   await store.upsert(userId, { enabled: true, last_time_step: enable.timeStep })
 *
 *   // Replay protection: the SAME code (same time step) must not verify twice.
 *   expect(verify({ secret, token: code, afterTimeStep: enable.timeStep }).valid).toBe(false)
 *   // A wrong code must reject — a verify() that always passes is a broken integration.
 *   expect(verify({ secret, token: '000000' }).valid).toBe(false)
 *
 *   await store.delete(userId)                                    // disable
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
