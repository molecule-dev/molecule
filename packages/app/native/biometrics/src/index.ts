/**
 * Biometric authentication interface for molecule.dev.
 *
 * Provides a unified API for biometric authentication (FaceID, TouchID,
 * Fingerprint) that works across different platforms.
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
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './webauthn.js'
