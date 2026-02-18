/**
 * Health utility functions for molecule.dev.
 *
 * @module
 */

import { querySleep, queryStatistics } from './provider.js'
import type { HealthDataType, SleepSample } from './types.js'

/**
 * Get the standard unit string for a health data type.
 * @param type - The health data type (e.g., 'steps', 'heartRate', 'weight').
 * @returns The unit string (e.g., 'count', 'bpm', 'kg'), or empty string for unknown types.
 */
export function getUnitForType(type: HealthDataType): string {
  const units: Record<HealthDataType, string> = {
    steps: 'count',
    distance: 'm',
    activeEnergy: 'kcal',
    basalEnergy: 'kcal',
    flights: 'count',
    exerciseTime: 'min',
    standTime: 'min',
    moveMinutes: 'min',
    weight: 'kg',
    height: 'cm',
    bodyMass: 'kg',
    bodyFat: '%',
    bmi: 'kg/m²',
    leanBodyMass: 'kg',
    waistCircumference: 'cm',
    heartRate: 'bpm',
    restingHeartRate: 'bpm',
    heartRateVariability: 'ms',
    bloodPressureSystolic: 'mmHg',
    bloodPressureDiastolic: 'mmHg',
    respiratoryRate: 'breaths/min',
    oxygenSaturation: '%',
    bodyTemperature: '°C',
    bloodGlucose: 'mg/dL',
    sleepAnalysis: 'min',
    sleepInBed: 'min',
    sleepAsleep: 'min',
    sleepAwake: 'min',
    sleepRem: 'min',
    sleepDeep: 'min',
    sleepCore: 'min',
    water: 'mL',
    caffeine: 'mg',
    calories: 'kcal',
    protein: 'g',
    carbohydrates: 'g',
    fat: 'g',
    fiber: 'g',
    sugar: 'g',
    sodium: 'mg',
    workout: 'min',
    mindfulMinutes: 'min',
  }
  return units[type] || ''
}

/**
 * Format a duration in seconds as a human-readable string (e.g., "2h 15m" or "30m").
 * @param seconds - Duration in seconds.
 * @param t - Optional i18n translation function for localized formatting.
 * @returns The formatted duration string.
 */
export function formatDuration(
  seconds: number,
  t?: (
    key: string,
    values?: Record<string, unknown>,
    options?: { defaultValue?: string },
  ) => string,
): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return t
      ? t(
          'health.durationHoursMinutes',
          { hours, minutes },
          { defaultValue: '{{hours}}h {{minutes}}m' },
        )
      : `${hours}h ${minutes}m`
  }
  return t
    ? t('health.durationMinutes', { minutes }, { defaultValue: '{{minutes}}m' })
    : `${minutes}m`
}

/**
 * Calculate sleep efficiency as the ratio of time asleep to time in bed.
 * @param sleep - The sleep sample to analyze.
 * @returns The sleep efficiency as a decimal between 0 and 1 (0 if no time in bed).
 */
export function calculateSleepEfficiency(sleep: SleepSample): number {
  if (sleep.timeInBed === 0) return 0
  return sleep.timeAsleep / sleep.timeInBed
}

/**
 * Get the ISO date range for today (midnight to midnight).
 * @returns An object with startDate and endDate as ISO strings.
 */
export function getTodayRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

/**
 * Get the ISO date range for the last N days (from N days ago at midnight to now).
 * @param days - Number of days to look back.
 * @returns An object with startDate and endDate as ISO strings.
 */
export function getLastDaysRange(days: number): {
  startDate: string
  endDate: string
} {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

/**
 * Get the total step count for today.
 * @returns The total number of steps taken today.
 */
export async function getStepsToday(): Promise<number> {
  const range = getTodayRange()
  const stats = await queryStatistics('steps', range)
  return stats.sum ?? 0
}

/**
 * Get the total active energy burned today in kcal.
 * @returns The total active energy burned today.
 */
export async function getActiveEnergyToday(): Promise<number> {
  const range = getTodayRange()
  const stats = await queryStatistics('activeEnergy', range)
  return stats.sum ?? 0
}

/**
 * Get the most recent sleep sample from the last 24 hours.
 * @returns The most recent SleepSample, or null if no sleep data is available.
 */
export async function getLastNightSleep(): Promise<SleepSample | null> {
  const range = getLastDaysRange(1)
  const samples = await querySleep(range)
  return samples[0] ?? null
}

/**
 * Predefined groups of related health data types for common use cases.
 */
export const DataTypeGroups = {
  activity: [
    'steps',
    'distance',
    'activeEnergy',
    'basalEnergy',
    'flights',
    'exerciseTime',
  ] as HealthDataType[],
  body: ['weight', 'height', 'bodyFat', 'bmi', 'leanBodyMass'] as HealthDataType[],
  vitals: [
    'heartRate',
    'restingHeartRate',
    'bloodPressureSystolic',
    'bloodPressureDiastolic',
    'oxygenSaturation',
    'bodyTemperature',
  ] as HealthDataType[],
  sleep: [
    'sleepAnalysis',
    'sleepInBed',
    'sleepAsleep',
    'sleepAwake',
    'sleepRem',
    'sleepDeep',
  ] as HealthDataType[],
  nutrition: [
    'water',
    'caffeine',
    'calories',
    'protein',
    'carbohydrates',
    'fat',
  ] as HealthDataType[],
} as const
