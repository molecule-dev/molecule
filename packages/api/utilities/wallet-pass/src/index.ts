/**
 * Apple Wallet (.pkpass) and Google Wallet pass-object generation for
 * server-side ticket / coupon delivery.
 *
 * Two independent sub-APIs:
 *
 * - {@link createApplePass} — produces a signed `.pkpass` zip (CMS detached
 *   signature over `manifest.json`, using the Apple developer-portal
 *   "Pass Type ID" cert + WWDR intermediate). Output is a `Buffer` ready
 *   to send with `Content-Type: application/vnd.apple.pkpass`.
 * - {@link createGoogleWalletJwt} — produces an RS256-signed JWT containing
 *   the pass class + pass object payloads. Embed the JWT into
 *   `https://pay.google.com/gp/v/save/<jwt>` for the "save to wallet" flow.
 *
 * Two HTTP handlers — {@link createApplePassHandler} and
 * {@link createGoogleWalletPassHandler} — wrap the generators with the same
 * minimal request/response contract used elsewhere in `@molecule/api-*`,
 * keeping the package framework-neutral.
 *
 * The package never displays text on its own and has no companion locale
 * bond: pass field labels are caller-supplied and already localized.
 *
 * @example
 * ```ts
 * import { createApplePass, createGoogleWalletJwt } from '@molecule/api-wallet-pass'
 *
 * // Apple
 * const pkpass = await createApplePass(passJsonPayload, signingCerts, assets)
 *
 * // Google
 * const jwt = createGoogleWalletJwt(passClass, passObject, serviceAccount)
 * const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './createApplePass.js'
export * from './createGoogleWalletJwt.js'
export * from './handlers.js'
export * from './types.js'
export * from './zip.js'
