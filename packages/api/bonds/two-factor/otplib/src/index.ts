/**
 * Two-factor authentication provider using otplib for molecule.dev.
 *
 * @remarks
 * **Testing the flow end-to-end without an authenticator app.** A TOTP feature
 * is only verified when a real code passes the challenge — and no phone is
 * needed for that: generate the current code from the stored base32 secret
 * with `otplib` itself (this bond's own dependency, already installed):
 *
 * ```bash
 * node -e "import('otplib').then(async o => console.log(await o.generate({ secret: process.argv[1] })))" <base32-secret>
 *
 * (otplib v13 exposes `generate({ secret })` — the v12 `authenticator.generate()`
 * was removed and will throw.)
 * ```
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
