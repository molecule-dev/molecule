/**
 * Runtime provider wiring system for molecule.dev.
 *
 * Enables swappable providers for email, auth, payments, uploads, and any
 * custom category — all through dynamic string-based keys.
 *
 * @example
 * ```typescript
 * import { bond, require as bondRequire, get, isBonded, getLogger } from '@molecule/api-bond'
 * import { provider as sendgrid } from '@molecule/api-emails-sendgrid'
 * import { paymentProvider } from '@molecule/api-payments-stripe'
 * import { serverName as githubServerName, verify as githubVerify } from '@molecule/api-oauth-github'
 *
 * // Wire providers at app startup (string-based categories)
 * bond('email', sendgrid)                                                          // singleton
 * bond('payments', 'stripe', paymentProvider)                                      // named
 * bond('oauth', 'github', { serverName: githubServerName, verify: githubVerify })  // named
 *
 * // Use anywhere in the app
 * const email = bondRequire<EmailTransport>('email')  // throws if not bonded
 * await email.sendMail({ ... })
 *
 * // Or check first
 * if (isBonded('email')) {
 *   const email = get<EmailTransport>('email')  // returns undefined if not bonded
 * }
 *
 * // Named providers
 * const stripePayments = get<PaymentProvider>('payments', 'stripe')
 *
 * // Safe logging (falls back to console if no logger bonded)
 * const logger = getLogger()
 * logger.info('Server started')
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Registry exports
export * from './registry.js'

// Bond API exports
export * from './bond.js'

// Logger utility exports
export * from './logger.js'

// Analytics utility exports
export * from './analytics.js'
