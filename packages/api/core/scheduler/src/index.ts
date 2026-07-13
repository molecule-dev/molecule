/**
 * Task scheduler interface for molecule.dev.
 *
 * Defines SchedulerProvider and ScheduledTask interfaces for periodic
 * background task execution.
 *
 * @example
 * ```typescript
 * import { schedule, setProvider, start } from '@molecule/api-scheduler'
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
 *
 * // REQUIRED: tasks do not execute until the scheduler is started.
 * // (Tasks scheduled after start() begin automatically.)
 * start()
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
