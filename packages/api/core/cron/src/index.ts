/**
 * Provider-agnostic cron scheduling interface for molecule.dev.
 *
 * Defines the `CronProvider` interface for scheduling, pausing, resuming,
 * cancelling, and manually triggering cron jobs. Bond packages (node-cron,
 * BullMQ, etc.) implement this interface. Application code uses the convenience
 * functions (`schedule`, `cancel`, `list`, `pause`, `resume`, `runNow`, `close`)
 * which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, schedule, list, close } from '@molecule/api-cron'
 * import { provider as nodeCron } from '@molecule/api-cron-node-cron'
 *
 * setProvider(nodeCron)
 *
 * const jobId = await schedule('cleanup', '0 3 * * *', async () => {
 *   console.log('Running nightly cleanup...')
 * })
 *
 * const jobs = await list()
 *
 * // On graceful shutdown / test teardown:
 * await close()
 * ```
 *
 * @remarks
 * `close()` releases the bonded provider's resources (timers, queue/worker
 * connections) and is a no-op if the provider doesn't implement it — call
 * it during shutdown instead of reaching for `getProvider().close?.()`
 * directly. `CronOptions.noOverlap` (per-job, default `false`) skips a tick
 * that arrives while the previous run of the same job is still executing;
 * support and cross-process coordination are provider-specific — see each
 * bond's module docs.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
