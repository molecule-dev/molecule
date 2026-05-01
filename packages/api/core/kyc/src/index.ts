/**
 * KYC / identity verification core interface for molecule.dev (server-side).
 *
 * Defines a stack-neutral contract for KYC bonds (Stripe Identity, Persona,
 * Onfido, Sumsub, etc.). Bond a provider at startup, then call the
 * convenience wrappers from anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, createVerificationSession } from '@molecule/api-kyc'
 * import { provider } from '@molecule/api-kyc-stripe-identity'
 *
 * setProvider(provider)
 *
 * const session = await createVerificationSession({
 *   userId: 'user-123',
 *   type: 'document',
 *   returnUrl: 'https://app.example.com/verify/done',
 * })
 *
 * // Redirect the end user to session.url ...
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
