/**
 * Two-factor authentication provider using otplib for molecule.dev.
 *
 * @example
 * ```typescript
 * import { generateSecret, getUrls, setProvider, verify } from '@molecule/api-two-factor'
 * import { provider } from '@molecule/api-two-factor-otplib'
 *
 * // Startup: bond once.
 * setProvider(provider)
 *
 * // 1. Enrolment: create a secret, store it on the user server-side (2FA not enabled yet),
 * //    and show the QR code.
 * const secret = generateSecret() // base32 string
 * const { keyUrl, QRImageUrl } = await getUrls({ username: 'ada@example.com', service: 'Acme', secret })
 * // QRImageUrl is a data:image/png URL for an <img>; keyUrl is the otpauth://totp/… link.
 *
 * // 2. Confirming enrolment AND every login: check the 6-digit code the user typed.
 * // lastTimeStep = the timeStep you stored after the previous success (null before the first).
 * async function checkCode(code: string, lastTimeStep: number | null): Promise<number | null> {
 *   const result = await verify({ secret, token: code, afterTimeStep: lastTimeStep ?? undefined })
 *   if (!result.valid) return null // result.reason: 'format' | 'replay' | undefined (wrong/expired)
 *   return result.timeStep ?? null // persist it: the same code is then rejected as 'replay'
 * }
 * ```
 *
 * @remarks
 * - **Persist `result.timeStep` after every successful `verify()` and pass it back as
 *   `afterTimeStep`** — that is the only replay protection; without it a code can be reused
 *   for its whole ~90s window. `null`/`undefined`/`-1` mean "no code used yet".
 * - **`verify()` never throws for a bad code**: a non-6-digit token resolves
 *   `{ valid: false, reason: 'format' }` (spaces are stripped first), a reused one
 *   `reason: 'replay'`, a wrong/expired one `{ valid: false }`. It THROWS only when the
 *   stored secret is not valid base32 (a corrupted record — re-run setup).
 * - Default `epochTolerance` is `[60, 30]` SECONDS (past, future), so a code stays valid
 *   ~60–90s after it was shown. Pass a tighter pair only if you accept rejecting slow typists.
 * - `generateSecret()` and the secret itself are server-side only — never accept a secret
 *   from the client, never log it, and only mark 2FA enabled after a code verifies.
 *
 * **Testing the flow end-to-end without an authenticator app.** A TOTP feature
 * is only verified when a real code passes the challenge — and no phone is
 * needed for that: generate the current code from the stored base32 secret
 * with `otplib` itself (this bond's own dependency, already installed):
 *
 * ```bash
 * node -e "import('otplib').then(async o => console.log(await o.generate({ secret: process.argv[1] })))" <base32-secret>
 * ```
 *
 * (otplib v13 exposes `generate({ secret })` — the v12 `authenticator.generate()`
 * was removed and will throw.)
 *
 * Use the secret returned by `generateSecret()` during setup (or read it back
 * from wherever the app stored it) to complete the enable + challenge steps in
 * a browser walkthrough or an integration test. Codes rotate every 30 seconds
 * — generate immediately before submitting. Never mock `verify()` to test the
 * flow; a generated real code exercises the same path a user's app does.
 *
 * @see https://www.npmjs.com/package/otplib
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
