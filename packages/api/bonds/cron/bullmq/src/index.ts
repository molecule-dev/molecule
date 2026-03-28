/**
 * BullMQ cron scheduling provider for molecule.dev.
 *
 * Implements the `CronProvider` interface using BullMQ repeatable jobs backed
 * by Redis. Jobs are persistent and distributed — they survive process restarts
 * and can be processed by multiple workers. Ideal for production environments
 * requiring reliability.
 *
 * @example
 * ```typescript
 * import { setProvider, schedule } from '@molecule/api-cron'
 * import { createProvider } from '@molecule/api-cron-bullmq'
 *
 * const provider = createProvider({
 *   connection: { host: 'localhost', port: 6379 },
 * })
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
