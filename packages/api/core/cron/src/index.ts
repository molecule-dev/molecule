/**
 * Provider-agnostic cron scheduling interface for molecule.dev.
 *
 * Defines the `CronProvider` interface for scheduling, pausing, resuming,
 * cancelling, and manually triggering cron jobs. Bond packages (node-cron,
 * BullMQ, etc.) implement this interface. Application code uses the convenience
 * functions (`schedule`, `cancel`, `list`, `pause`, `resume`, `runNow`)
 * which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, schedule, list } from '@molecule/api-cron'
 * import { provider as nodeCron } from '@molecule/api-cron-node-cron'
 *
 * setProvider(nodeCron)
 *
 * const jobId = await schedule('cleanup', '0 3 * * *', async () => {
 *   console.log('Running nightly cleanup...')
 * })
 *
 * const jobs = await list()
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
