/**
 * Axiom logger provider for molecule.dev.
 *
 * Every log call is written to an inner logger (the console by default)
 * exactly as before, and lines at or above a level are also queued as
 * structured events in an [Axiom](https://axiom.co) dataset. Sending is
 * batched and asynchronous through the same ingest client as
 * `@molecule/api-analytics-axiom`, so a log call never waits on the network.
 *
 * @example
 * ```typescript
 * import { logger, setLogger } from '@molecule/api-logger'
 * import { createLogger } from '@molecule/api-logger-axiom'
 *
 * const axiomLogger = createLogger({
 *   // token / dataset default to AXIOM_TOKEN / AXIOM_DATASET
 *   level: 'warn', // mirror warn + error only; everything still prints locally
 *   service: 'my-api',
 * })
 * setLogger(axiomLogger)
 *
 * logger.warn('Payment webhook retried', { provider: 'stripe', attempt: 2 })
 * // Axiom event: { _time, kind: 'log', level: 'warn',
 * //   message: 'Payment webhook retried',
 * //   fields: '{"provider":"stripe","attempt":2}', service: 'my-api', env }
 *
 * await axiomLogger.shutdown() // before exit
 * ```
 *
 * @remarks
 * - **No token or no dataset → console only.** `enabled` is `false` and nothing
 *   is queued; the inner logger still gets every line. Same env vars as
 *   `@molecule/api-analytics-axiom`: `AXIOM_TOKEN`, `AXIOM_DATASET`,
 *   `AXIOM_ORG_ID`, `AXIOM_EDGE_URL`. Pass `dataset` to send logs to a
 *   different dataset than your events.
 * - Two level gates apply in order: the logger CORE's (`LOG_LEVEL`, default
 *   `info`) drops lines before this provider sees them; then `level` (default
 *   `info`) decides which of the remaining lines are mirrored to Axiom.
 * - Arguments are split into `message` (strings, numbers, booleans joined by
 *   spaces) and fields (plain objects merged; an `Error` becomes
 *   `error: { name, message, stack }`). With `fieldsMode: 'json'` (the default)
 *   fields are ONE string field, so arbitrary log keys never add columns to the
 *   dataset — Axiom caps fields per dataset (256 on the free plan) — and you
 *   query them with `parse_json(fields)`. `fieldsMode: 'object'` stores one
 *   column per key.
 * - `inner: null` sends to Axiom only. The default inner logger writes to the
 *   console; pass another provider (pino, winston) to keep its formatting.
 * - Ingest failures warn through `console.warn` at most once a minute per kind
 *   and never through this logger, so an unreachable Axiom cannot loop.
 * - Short-lived processes: `await logger.shutdown()` (or `flush()`) before exit.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
