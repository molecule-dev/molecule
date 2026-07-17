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
 *   the pass class + pass object payloads for the selected
 *   {@link GoogleWalletPassType} (event ticket, offer/coupon, loyalty, gift
 *   card, flight, transit, or generic). Embed the JWT into
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
 * // Google — event ticket (default)
 * const jwt = createGoogleWalletJwt(passClass, passObject, serviceAccount)
 * const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`
 *
 * // Google — coupon (offer pass type)
 * const couponJwt = createGoogleWalletJwt(
 *   passClass, passObject, serviceAccount, undefined, 'coupon',
 * )
 * ```
 *
 * @remarks
 * Both generators cover their vendor's full pass-type range. The Apple
 * generator accepts all five PassKit styles (`eventTicket`, `boardingPass`,
 * `coupon`, `generic`, `storeCard`) via {@link ApplePassData}. The Google
 * generator selects its pass type via the `passType` argument
 * ({@link GoogleWalletPassType}) and routes to the matching JWT payload keys —
 * `eventTicket`, `offer`/`coupon`, `loyalty`, `giftCard`, `flight`, `transit`,
 * or `generic` — defaulting to `eventTicket`.
 *
 * Signing material is caller-supplied PEM strings — this package reads no
 * environment variables and makes NO network calls (signing is fully local).
 * Store the PEMs as your app's own secrets and load them in your resolver.
 * Apple: the developer-portal "Pass Type ID" certificate + its private key
 * ({@link ApplePassCertificates}`.password` decrypts an encrypted key) and
 * Apple's WWDR intermediate certificate. Google: a service account
 * (clientEmail + RSA private key) attached to your Wallet issuer account.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './createApplePass.js'
export * from './createGoogleWalletJwt.js'
export * from './handlers.js'
export * from './types.js'
export * from './zip.js'
