/**
 * `@molecule/app-battery`
 * Utility functions for battery module
 */

import { getLevel } from './provider.js'
import type { BatteryStatus, ChargingState } from './types.js'

/**
 * Convert battery level to percentage
 * @param level - Battery level (0-1)
 * @returns The battery level as a rounded integer percentage (0-100).
 */
export function toPercentage(level: number): number {
  return Math.round(level * 100)
}

/**
 * Get battery level as text
 * @param level - Battery level (0-1)
 * @returns The battery level formatted as a percentage string (e.g., "85%").
 */
export function getLevelText(level: number): string {
  return `${toPercentage(level)}%`
}

/**
 * Get charging state description
 * @param state - Charging state
 * @param t - Optional translation function for localized descriptions
 * @returns A human-readable label for the charging state (e.g., "Charging", "On Battery").
 */
export function getChargingStateText(
  state: ChargingState,
  t?: (
    key: string,
    values?: Record<string, unknown>,
    options?: { defaultValue?: string },
  ) => string,
): string {
  const defaults: Record<ChargingState, string> = {
    charging: 'Charging',
    discharging: 'On Battery',
    full: 'Fully Charged',
    'not-charging': 'Not Charging',
    unknown: 'Unknown',
  }
  const defaultText = defaults[state]
  return t ? t(`battery.${state}`, undefined, { defaultValue: defaultText }) : defaultText
}

/**
 * Format remaining time
 * @param seconds - Remaining time in seconds
 * @param t - Optional translation function for localized formatting
 * @returns A human-readable time string (e.g., "2h 15m" or "30m"), or "Unknown" if the value is not finite.
 */
export function formatRemainingTime(
  seconds: number,
  t?: (
    key: string,
    values?: Record<string, unknown>,
    options?: { defaultValue?: string },
  ) => string,
): string {
  if (!isFinite(seconds) || seconds < 0) {
    return t ? t('battery.remainingUnknown', undefined, { defaultValue: 'Unknown' }) : 'Unknown'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return t
      ? t('battery.remainingTime', { hours, minutes }, { defaultValue: '{{hours}}h {{minutes}}m' })
      : `${hours}h ${minutes}m`
  }
  return t
    ? t('battery.remainingMinutes', { minutes }, { defaultValue: '{{minutes}}m' })
    : `${minutes}m`
}

/**
 * Get battery icon name based on level and charging state
 * @param status - Battery status
 * @returns The icon name corresponding to the battery level and charging state.
 */
export function getBatteryIcon(status: BatteryStatus): string {
  if (status.isCharging) {
    return 'battery-charging'
  }

  const percentage = toPercentage(status.level)

  if (percentage >= 90) return 'battery-full'
  if (percentage >= 75) return 'battery-three-quarters'
  if (percentage >= 50) return 'battery-half'
  if (percentage >= 25) return 'battery-quarter'
  return 'battery-empty'
}

/**
 * Check if battery level is above threshold
 * @param level - Battery level (0-1)
 * @param threshold - Threshold (0-1)
 * @returns Whether the battery level exceeds the given threshold.
 */
export function isAboveThreshold(level: number, threshold: number): boolean {
  return level > threshold
}

/**
 * Wait for battery to reach a level
 * @param targetLevel - Target level (0-1)
 * @param options - Polling and timeout options
 * @param options.timeout - Maximum time to wait in milliseconds (0 for no timeout)
 * @param options.checkInterval - Interval between level checks in milliseconds
 * @returns Whether the target level was reached before timeout.
 */
export function waitForLevel(
  targetLevel: number,
  options?: {
    timeout?: number
    checkInterval?: number
  },
): Promise<boolean> {
  const timeout = options?.timeout ?? 0 // 0 = no timeout
  const checkInterval = options?.checkInterval ?? 5000

  return new Promise((resolve) => {
    const startTime = Date.now()

    const check = async (): Promise<void> => {
      const level = await getLevel()

      if (level >= targetLevel) {
        resolve(true)
        return
      }

      if (timeout > 0 && Date.now() - startTime >= timeout) {
        resolve(false)
        return
      }

      setTimeout(check, checkInterval)
    }

    check()
  })
}

/**
 * Create a battery-aware task executor
 * @param minimumLevel - Minimum battery level to execute (0-1)
 * @returns An executor object with `execute` and `canExecute` methods gated by battery level.
 */
export function createBatteryAwareExecutor(minimumLevel = 0.2): {
  execute<T>(task: () => T | Promise<T>, fallback?: () => T | Promise<T>): Promise<T | undefined>
  canExecute(): Promise<boolean>
} {
  return {
    /**
     * Execute task if battery level is sufficient
     * @param task - Task to execute
     * @param fallback - Fallback if battery is low
     * @returns The task result, the fallback result, or undefined if battery is low with no fallback.
     */
    async execute<T>(
      task: () => T | Promise<T>,
      fallback?: () => T | Promise<T>,
    ): Promise<T | undefined> {
      const level = await getLevel()

      if (level >= minimumLevel) {
        return task()
      }

      if (fallback) {
        return fallback()
      }

      return undefined
    },

    /**
     * Check if task can be executed
     * @returns Whether the current battery level meets the minimum threshold.
     */
    async canExecute(): Promise<boolean> {
      const level = await getLevel()
      return level >= minimumLevel
    },
  }
}
