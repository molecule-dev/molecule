/**
 * Task scheduler interface for molecule.dev.
 *
 * Defines SchedulerProvider and ScheduledTask interfaces for periodic
 * background task execution.
 *
 * @example
 * ```typescript
 * import { setProvider, schedule } from '@molecule/api-scheduler'
 * import { provider } from '@molecule/api-scheduler-default'
 *
 * setProvider(provider)
 *
 * schedule({
 *   name: 'cleanup',
 *   intervalMs: 60000,
 *   async handler() {
 *     await cleanupExpiredRecords()
 *   },
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
