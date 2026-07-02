/**
 * Error tracking core interface for molecule.dev.
 *
 * Defines the standard interface for error tracking / crash reporting
 * providers (Sentry, console, etc.) plus never-throwing convenience
 * functions (`captureException`, `captureMessage`, `setUser`, `flush`)
 * that delegate to the bonded provider.
 *
 * This is distinct from `@molecule/api-monitoring`, which is health checks
 * (is the database up?). Error tracking captures individual unexpected
 * exceptions with context so they can be aggregated and triaged.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, captureException, captureMessage } from '@molecule/api-error-tracking'
 * import { provider } from '@molecule/api-error-tracking-sentry'
 *
 * // Bond a provider at startup (skip this and every capture is a no-op)
 * setProvider(provider)
 *
 * // Report an unexpected exception with normalized context
 * try {
 *   await chargeCustomer(order)
 * } catch (error) {
 *   captureException(error, {
 *     tags: { source: 'billing' },
 *     user: { id: order.userId },
 *     extra: { orderId: order.id },
 *   })
 *   throw error
 * }
 *
 * // Report a standalone message
 * captureMessage('Payment retry queue is backing up', 'warning')
 * ```
 * @remarks
 * - **The convenience functions NEVER throw and no-op when unbonded.** Error
 *   tracking is a diagnostic side-channel: an app without a bonded tracker
 *   (or with a broken one) must behave exactly as if the calls weren't
 *   there. Do NOT wrap `captureException` in defensive try/catch — it is
 *   already safe to call anywhere, including inside error middleware.
 * - The default Express error path (`@molecule/api-server-default-express`)
 *   already calls `captureException` for genuine unexpected errors (untagged
 *   500s, uncaught exceptions, unhandled rejections). Tagged config-missing
 *   503s and 4xx responses are deliberately NOT captured — they are expected,
 *   user-actionable conditions, not defects.
 * - `getProvider()` throws when unbonded (like other cores); prefer the
 *   convenience functions or `getOptionalProvider()` in reporting paths.
 * - Context is normalized (`tags`/`user`/`extra`/`request`) — never pass
 *   provider-specific (e.g. Sentry) scope objects through this interface.
 */

export * from './error-tracking.js'
export * from './provider.js'
export * from './types.js'
