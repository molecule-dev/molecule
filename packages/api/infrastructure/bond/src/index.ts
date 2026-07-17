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
 * @remarks
 * **NEVER call a bond-backed function at module top-level.** Bond accessors —
 * `require()`/`get()`/`getProvider()` and anything built on them (cron
 * `schedule()`, cache get/set, queue enqueue, notification-center `send()`) —
 * THROW if their provider isn't bonded yet (`"<X> provider not configured"`).
 * Module top-level runs at IMPORT time, which is BEFORE `server.ts` calls
 * `setupBonds()`. So a top-level `schedule('reminders', …)` (e.g. in a new
 * `jobs/*.ts` or `cron-*.ts`) crashes the API at boot — the build type-checks
 * clean but the server never comes up.
 *
 * Wrap such work in a function and invoke it AFTER bonds are wired — e.g.
 * `export function startReminders() { schedule(…) }`, then call
 * `startReminders()` near the end of `server.ts` startup (after `setupBonds()`),
 * or call it inside a request handler. Keep module top-level to imports + pure
 * declarations only.
 *
 * **All api cores read this registry.** Every `@molecule/api-*` core routes
 * its `setProvider()`/`getProvider()` through this bond registry (the
 * `api-ai-embeddings`/`-image-generation`/`-speech`/`-translation`/
 * `-vector-store` cores were migrated off their old module-local singletons),
 * so `bond('<category>', provider)` and the core's own `setProvider()` write
 * the same slot and `validateBonds()` detects a missing provider. Use either.
 *
 * Fail fast on missing wiring: cores call `expectBond(type)` at module
 * scope, and calling `validateBonds()` once at the END of your startup
 * wiring turns "crashes later on first use" into one clear boot error
 * listing every expected-but-unbonded category.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Registry exports
export * from './registry.js'

// Bond API exports
export * from './bond.js'

// Logger utility exports
export * from './logger.js'

// Analytics utility exports
export * from './analytics.js'
