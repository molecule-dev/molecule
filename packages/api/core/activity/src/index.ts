/**
 * Activity capture core interface for molecule.dev.
 *
 * Defines the {@link ActivityEvent} shape and the {@link ActivitySink}
 * interface (`record(event)`), bonded via `bond('activity-sink', sink)`.
 * Per-category capture provider bonds build events from the call args of the
 * category interface they wrap and forward them to the bonded sink via the
 * free-function {@link record}, which no-ops if no sink is bonded.
 *
 * @remarks
 * **`record()` is best-effort by contract.** Activity recording is a
 * side-channel for dev visibility (the IDE Activity panel, inline Synthase
 * chat cards) — it must never break the real business operation (sending an
 * email, enqueueing a job, dispatching a webhook, …) that emitted the event.
 * A sink that throws or rejects inside `record()` is caught and logged via
 * `logger.warn`, never re-thrown. `ActivitySink` implementations are
 * themselves documented to catch their own errors; this accessor-level catch
 * is defense-in-depth for a sink that doesn't honor that.
 * - The setter is `setSink()` (bond key `'activity-sink'`), NOT `setProvider()` —
 *   there is no `setProvider` export in this package.
 * - With no sink bonded, `record()` silently does nothing — nothing is logged and
 *   nothing throws, so a forgotten `setSink()` looks like "no activity".
 * - This package only RECORDS events; it does not send emails/SMS/webhooks. Capture
 *   provider bonds (e.g. an emails capture bond) call `record()` for you.
 * - `timestamp` is an ISO 8601 string (`new Date().toISOString()`), not a `Date`
 *   or epoch number; `type` is one of `'email' | 'sms' | 'push' | 'webhook' | 'channel'`.
 *
 * @example
 * ```typescript
 * import { record, setSink } from '@molecule/api-activity'
 * import { provider } from '@molecule/api-activity-console'
 *
 * // Startup: bond a sink (console logs each event via the bonded logger).
 * setSink(provider)
 *
 * // Record an event from a capture provider (no-ops if no sink bonded)
 * await record({
 *   id: crypto.randomUUID(),
 *   type: 'email',
 *   status: 'captured',
 *   recipient: 'user@example.com',
 *   summary: 'Welcome email',
 *   timestamp: new Date().toISOString(),
 * })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
