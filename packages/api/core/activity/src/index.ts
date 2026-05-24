/**
 * Activity capture core interface for molecule.dev.
 *
 * Defines the {@link ActivityEvent} shape and the {@link ActivitySink}
 * interface (`record(event)`), bonded via `bond('activity-sink', sink)`.
 * Per-category capture provider bonds build events from the call args of the
 * category interface they wrap and forward them to the bonded sink via the
 * free-function {@link record}, which no-ops if no sink is bonded.
 *
 * @example
 * ```typescript
 * import { setSink, record } from '@molecule/api-activity'
 * import { provider } from '@molecule/api-activity-console'
 *
 * // Wire a sink at startup
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

export * from './provider.js'
export * from './types.js'
