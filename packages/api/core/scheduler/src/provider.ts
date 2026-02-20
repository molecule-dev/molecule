/**
 * Scheduler provider bond accessor and convenience functions.
 *
 * @module
 */

import { bond, get as bondGet, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { ScheduledTask, SchedulerProvider, TaskStatus } from './types.js'

const BOND_TYPE = 'scheduler'

/**
 * Registers a scheduler provider as the active singleton.
 *
 * @param provider - The scheduler provider implementation to bond.
 */
export const setProvider = (provider: SchedulerProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded scheduler provider, throwing if none is configured.
 *
 * @returns The bonded scheduler provider.
 * @throws {Error} If no scheduler provider has been bonded.
 */
export const getProvider = (): SchedulerProvider => {
  try {
    return bondRequire<SchedulerProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('scheduler.error.noProvider', undefined, {
        defaultValue: 'Scheduler provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a scheduler provider is currently bonded.
 *
 * @returns `true` if a scheduler provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded scheduler provider, returning null if none is bonded.
 *
 * @returns The bonded scheduler provider, or null.
 */
export const getOptionalProvider = (): SchedulerProvider | null => {
  return bondGet<SchedulerProvider>(BOND_TYPE) ?? null
}

/**
 * Registers and starts a scheduled task through the bonded provider.
 *
 * @param task - The task to schedule.
 * @throws {Error} If no scheduler provider is bonded.
 */
export const schedule = (task: ScheduledTask): void => {
  getProvider().schedule(task)
}

/**
 * Stops and removes a scheduled task by name.
 *
 * @param name - The task name.
 * @returns true if found and removed, false otherwise.
 * @throws {Error} If no scheduler provider is bonded.
 */
export const unschedule = (name: string): boolean => {
  return getProvider().unschedule(name)
}

/**
 * Returns the runtime status of all scheduled tasks.
 *
 * @returns An array of TaskStatus for every registered task.
 * @throws {Error} If no scheduler provider is bonded.
 */
export const getAllStatuses = (): TaskStatus[] => {
  return getProvider().getAllStatuses()
}
