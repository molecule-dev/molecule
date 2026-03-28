/**
 * node-cron scheduling provider for molecule.dev.
 *
 * Implements the `CronProvider` interface using the `node-cron` library for
 * lightweight in-process cron scheduling. Supports standard cron expressions,
 * timezone configuration, pause/resume, and manual triggering. Jobs are
 * in-memory and do not persist across process restarts.
 *
 * @example
 * ```typescript
 * import { setProvider, schedule } from '@molecule/api-cron'
 * import { provider } from '@molecule/api-cron-node-cron'
 *
 * setProvider(provider)
 *
 * await schedule('cleanup', '0 3 * * *', async () => {
 *   console.log('Nightly cleanup')
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
