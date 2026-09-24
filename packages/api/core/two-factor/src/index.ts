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
 * **Code freshness — what a failed verify() actually means.** TOTP codes rotate every 30s;
 * the default acceptance window is `[60, 30]` (≈60–90s of past validity). So:
 * - Generate/read the code IMMEDIATELY before verifying. A code that sat through a slow flow
 *   legitimately expires — on `valid:false`, generate a FRESH code and retry ONCE before
 *   suspecting your wiring (or this library).
 * - `{ valid: false, reason: 'replay' }` means the code was ALREADY USED (single-use
 *   protection): wait for the NEXT code. This is correct behavior, not a bug. A provider
 *   may also report this when the SERVER clock has moved backward since the last successful
 *   verify (VM snapshot restore, NTP correction, container clock drift) — no code can be
 *   newer than the one already consumed until wall-clock time catches back up. Same message
 *   ("wait"), different root cause; it will resolve on its own once the clock is correct.
 * - `{ valid: false, reason: 'format' }` means the token isn't a syntactically valid code
 *   (wrong length / non-digits). Authenticator-app grouping whitespace (`"123 456"`) is
 *   stripped automatically before this check, so this is a real typo: prompt the user to
 *   re-enter the code — the secret and the wiring are fine.
 * - `verify()` THROWS (does not resolve `valid:false`) when the STORED SECRET itself is
 *   unusable — missing, or not valid base32 (server-side data corruption). Handle this
 *   separately from a normal rejection: tell the user to re-run setup, not to re-enter a code.
 * - Re-running setup regenerates the PENDING secret — codes computed from the previous
 *   QR/secret will never verify again. Do not click "set up" twice and reuse the first QR.
 * - `verify()`, `getUrls()`, and otplib v13's `generate()` are all ASYNC — always `await`.
 *
 * (The end-to-end lifecycle to drive is the `@e2e` checklist below.)
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
 * **Testing it:** compute a REAL code from the enrollment secret with otplib v13
 * (`await generate({ secret })` from `'otplib'` — NOT the removed v12
 * `authenticator.generate`), verify it immediately, and ALSO assert a wrong code (`000000`)
 * is rejected — a `verify()` that always returns true passes a happy-path-only test.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { logger } from '@molecule/api-logger'
 * import { generateSecret, getUrls, setProvider, verify } from '@molecule/api-two-factor'
 * import { provider } from '@molecule/api-two-factor-otplib'
 *
 * // Startup: bond the TOTP provider.
 * setProvider(provider)
 *
 * // YOUR server-side 2FA record per user id (a Map is lost on restart — use a DB table).
 * interface TwoFactorRecord {
 *   secret: string
 *   enabled: boolean
 *   lastTimeStep?: number
 * }
 * const twoFactorStore = new Map<string, TwoFactorRecord>()
 *
 * // Mount AFTER your auth middleware, which sets res.locals.userId / res.locals.email.
 * const router = express.Router()
 * router.use(express.json())
 *
 * router.get('/status', (_req, res) => {
 *   const record = twoFactorStore.get(String(res.locals.userId))
 *   res.json({ enabled: record?.enabled ?? false }) // a boolean — never the secret
 * })
 *
 * router.post('/setup', async (_req, res) => {
 *   const secret = generateSecret()
 *   twoFactorStore.set(String(res.locals.userId), { secret, enabled: false }) // PENDING
 *   const urls = await getUrls({ username: String(res.locals.email), service: 'MyApp', secret })
 *   res.json({ keyUrl: urls.keyUrl, QRImageUrl: urls.QRImageUrl }) // never the raw secret
 * })
 *
 * // /enable (the login-time /verify is the same check) — the browser sends ONLY the token.
 * router.post('/enable', async (req, res) => {
 *   const userId = String(res.locals.userId)
 *   const record = twoFactorStore.get(userId)
 *   if (!record) return void res.status(400).json({ error: 'Run setup first' })
 *   try {
 *     const result = await verify({
 *       secret: record.secret, // loaded server-side, never from the client
 *       token: String(req.body.token ?? ''),
 *       afterTimeStep: record.lastTimeStep, // single-use replay protection
 *     })
 *     if (!result.valid) {
 *       const used = result.reason === 'replay'
 *       return void res.status(400).json({ error: used ? 'Code already used' : 'Invalid code' })
 *     }
 *     twoFactorStore.set(userId, { ...record, enabled: true, lastTimeStep: result.timeStep })
 *     res.json({ enabled: true })
 *   } catch (error) {
 *     // verify() THROWS only when the STORED secret is unusable — ask the user to re-run setup.
 *     logger.error('2FA verify failed: stored secret unusable', { error, userId })
 *     res.status(500).json({ error: 'Two-factor setup is corrupted — please re-run setup' })
 *   }
 * })
 * ```
 *
 * @e2e
 * Integration checklist — drive the app's REAL UI as the user would (in
 * molecule.dev: navigate_preview → read_preview_ui → interact_preview, targeting
 * elements by data-mol-id), adapt to this app's actual auth/settings screens, and
 * check every box off one by one. A box you can't check is an integration bug to
 * fix — not a skip:
 * - [ ] Sign up + log in through the real auth screens still works — do this
 *   FIRST; the most common 2FA-integration regression is a broken login.
 * - [ ] Open security/settings → "Set up 2FA" → a QR code / secret key is
 *   VISIBLE. An error here means the server-side setup route or 2FA store is broken.
 * - [ ] Entering a REAL TOTP code enables 2FA; a made-up `000000` must FAIL.
 *   COUNTERPARTY: the secret is shown on screen during setup — compute the current
 *   6-digit code from it with the preinstalled otplib (v13: `await generate({ secret })`;
 *   both otplib's `generate()` and this package's `verify()` are async). NEVER add
 *   an endpoint that leaks the stored secret to the client to obtain the code.
 * - [ ] Log out, log back in → the 2FA challenge appears AFTER the password → a
 *   valid code completes login; a wrong code is rejected with a clear error.
 * - [ ] Disable 2FA from settings → log out / log back in → no challenge.
 * Keep a real-path integration test in the repo (see "Testing it" above) so the
 * lifecycle stays covered on every later build.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
