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
 * @example
 * ```typescript
 * import { captureException, captureMessage, flush, setProvider } from '@molecule/api-error-tracking'
 * // Logs captures, needs no credentials; bond `@molecule/api-error-tracking-sentry`
 * // (SENTRY_DSN) instead when a Sentry project exists.
 * import { provider as consoleTracker } from '@molecule/api-error-tracking-console'
 *
 * // Startup: bond one tracker (skip this and every capture is a silent no-op).
 * setProvider(consoleTracker)
 *
 * const order = { id: 'ord_42', userId: 'user-123' }
 * const chargeCustomer = async (o: { id: string }): Promise<void> => {
 *   throw new Error(`card declined for ${o.id}`)
 * }
 *
 * try {
 *   await chargeCustomer(order)
 * } catch (error) {
 *   // Never throws — no try/catch needed around it. Returns the event id (or undefined).
 *   const eventId = captureException(error, {
 *     tags: { source: 'billing' },
 *     user: { id: order.userId },
 *     extra: { orderId: order.id },
 *   })
 *   console.error(`Charge failed; report ${eventId}`)
 * }
 *
 * captureMessage('Payment retry queue is backing up', 'warning')
 * await flush(2000) // ms — call before the process exits so buffered reports are sent
 * ```
 *
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
 * - `flush(timeoutMs)` takes MILLISECONDS and resolves `false` (never rejects) when delivery
 *   did not finish in time.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './error-tracking.js'
export * from './provider.js'
export * from './types.js'
