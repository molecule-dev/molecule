/**
 * Console activity sink for molecule.dev.
 *
 * Logs captured activity events via `@molecule/api-logger`. The default sink
 * for standalone scaffolded apps.
 *
 * @example
 * ```typescript
 * import { record, setSink } from '@molecule/api-activity'
 * import { provider } from '@molecule/api-activity-console'
 *
 * // Startup: bond the sink through the activity core.
 * setSink(provider)
 *
 * // Wherever an email/SMS/push/webhook is captured or sent:
 * await record({
 *   id: crypto.randomUUID(),
 *   type: 'email',
 *   status: 'sent',
 *   recipient: 'user@example.com',
 *   summary: 'Welcome email',
 *   timestamp: new Date().toISOString(),
 * })
 * // logger.info: '[activity] email sent → user@example.com: Welcome email'
 * ```
 *
 * @remarks
 * - Wire it with `setSink(provider)` from `@molecule/api-activity`, then emit
 *   events with that core's `record()` — `record()` silently no-ops when no
 *   sink is bonded.
 * - It only LOGS: one `logger.info` line per event through `@molecule/api-logger`
 *   (hidden when `LOG_LEVEL` is above `info`). Nothing is stored or forwarded —
 *   use `@molecule/api-activity-http` to ship events to an ingest endpoint.
 * - The full event (including `payload`) is passed to the logger as the second
 *   argument; don't put secrets in `payload`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
