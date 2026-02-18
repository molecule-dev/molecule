/**
 * Two-factor authentication interface for molecule.dev.
 *
 * Provides an abstract two-factor authentication interface that can be
 * backed by any TOTP library. Use `setProvider` to provide a concrete
 * implementation such as `@molecule/api-two-factor-otplib`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
