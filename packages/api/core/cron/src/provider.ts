/**
 * Cron provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-cron-node-cron`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { CronJob, CronOptions, CronProvider } from './types.js'

const BOND_TYPE = 'cron'
expectBond(BOND_TYPE)

/**
 * Registers a cron provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The cron provider implementation to bond.
 */
export const setProvider = (provider: CronProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded cron provider, throwing if none is configured.
 *
 * @returns The bonded cron provider.
 * @throws {Error} If no cron provider has been bonded.
 */
export const getProvider = (): CronProvider => {
  try {
    return bondRequire<CronProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('cron.error.noProvider', undefined, {
        defaultValue: 'Cron provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a cron provider is currently bonded.
 *
 * @returns `true` if a cron provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Schedules a new cron job.
 *
 * @param name - Human-readable name for the job.
 * @param cron - A cron expression defining the schedule.
 * @param handler - The async function to execute on each tick.
 * @param options - Optional scheduling configuration.
 * @returns The unique job identifier.
 * @throws {Error} If no cron provider has been bonded.
 */
export const schedule = async (
  name: string,
  cron: string,
  handler: () => Promise<void>,
  options?: CronOptions,
): Promise<string> => {
  return getProvider().schedule(name, cron, handler, options)
}

/**
 * Cancels and removes a scheduled job.
 *
 * @param jobId - The job identifier.
 * @returns Resolves when the job is cancelled.
 * @throws {Error} If no cron provider has been bonded.
 */
export const cancel = async (jobId: string): Promise<void> => {
  return getProvider().cancel(jobId)
}

/**
 * Lists all registered cron jobs.
 *
 * @returns An array of cron job descriptors.
 * @throws {Error} If no cron provider has been bonded.
 */
export const list = async (): Promise<CronJob[]> => {
  return getProvider().list()
}

/**
 * Pauses a running cron job without removing it.
 *
 * @param jobId - The job identifier.
 * @returns Resolves when the job is paused.
 * @throws {Error} If no cron provider has been bonded.
 */
export const pause = async (jobId: string): Promise<void> => {
  return getProvider().pause(jobId)
}

/**
 * Resumes a previously paused cron job.
 *
 * @param jobId - The job identifier.
 * @returns Resolves when the job is resumed.
 * @throws {Error} If no cron provider has been bonded.
 */
export const resume = async (jobId: string): Promise<void> => {
  return getProvider().resume(jobId)
}

/**
 * Triggers immediate execution of a job regardless of its schedule.
 *
 * @param jobId - The job identifier.
 * @returns Resolves when the job execution completes.
 * @throws {Error} If no cron provider has been bonded.
 */
export const runNow = async (jobId: string): Promise<void> => {
  return getProvider().runNow(jobId)
}
