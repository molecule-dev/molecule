/**
 * Biometric authentication interface for molecule.dev.
 *
 * Provides a unified API for biometric authentication (FaceID, TouchID,
 * Fingerprint) that works across different platforms.
 *
 * @example
 * ```ts
 * import { checkAvailability, authenticate } from '@molecule/app-biometrics'
 *
 * // On web this works with ZERO wiring: a WebAuthn-based provider is
 * // auto-registered on first use (secure context + user gesture required).
 * const availability = await checkAvailability()
 * if (availability.available) {
 *   const result = await authenticate({
 *     reason: 'Confirm it is you before revealing the recovery codes',
 *   })
 *   if (result.success) {
 *     // unlock the locally-guarded action — see @remarks: this is NOT server auth
 *   }
 * }
 * ```
 *
 * @remarks
 * **A successful {@link authenticate} is a CLIENT-side gate, NOT server authentication.**
 * FaceID / TouchID / fingerprint unlocking the device proves nothing to your API — the server
 * still requires a valid session/token on every request. Use biometrics to locally re-confirm a
 * sensitive action or unlock a stored value; NEVER treat a biometric "success" as authorization
 * for a backend call, and never send `biometricPassed=true` to the server and trust it.
 * (WebAuthn via {@link createWebAuthnProvider} is different — it's a real cryptographic assertion
 * your server verifies.)
 *
 * - Gate on {@link checkAvailability} / {@link isDeviceSecure} first, and always offer a
 *   password fallback — many devices have no enrolled biometrics.
 * - **A WebAuthn provider is auto-registered on first use when none is set** — great on web
 *   (needs a secure context and a user gesture), but on React Native or other non-browser
 *   runtimes the auto-registered provider cannot work (`navigator.credentials` does not exist):
 *   there is currently NO prebuilt native bond, so on native you must implement
 *   `BiometricsProvider` over the platform biometric API and call `setProvider()` BEFORE any
 *   call auto-bonds the web one.
 * - Check availability from a user-initiated flow; browsers reject WebAuthn calls that are not
 *   tied to user activation.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './webauthn.js'
