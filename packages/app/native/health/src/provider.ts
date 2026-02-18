/**
 * Health provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type {
  HealthAuthStatus,
  HealthCapabilities,
  HealthDataType,
  HealthProvider,
  HealthQueryOptions,
  HealthSample,
  SleepSample,
  WorkoutSample,
} from './types.js'

const BOND_TYPE = 'health'

/**
 * Set the health provider.
 * @param provider - HealthProvider implementation to register.
 */
export function setProvider(provider: HealthProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current health provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active HealthProvider instance.
 */
export function getProvider(): HealthProvider {
  const provider = bondGet<HealthProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('health.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-health: No provider set. Call setProvider() with a HealthProvider implementation (e.g., from @molecule/app-health-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a health provider has been registered.
 * @returns Whether a HealthProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Request authorization to read and/or write health data types.
 * @param readTypes - Health data types to request read access for.
 * @param writeTypes - Health data types to request write access for (optional).
 * @returns Whether authorization was granted.
 */
export async function requestAuthorization(
  readTypes: HealthDataType[],
  writeTypes?: HealthDataType[],
): Promise<boolean> {
  return getProvider().requestAuthorization(readTypes, writeTypes)
}

/**
 * Check the authorization status for a specific health data type and access level.
 * @param type - The health data type to check.
 * @param access - Whether checking 'read' or 'write' access.
 * @returns The authorization status: 'authorized', 'denied', 'notDetermined', 'sharingDenied', or 'unsupported'.
 */
export async function getAuthorizationStatus(
  type: HealthDataType,
  access: 'read' | 'write',
): Promise<HealthAuthStatus> {
  return getProvider().getAuthorizationStatus(type, access)
}

/**
 * Query health data samples for a given type and date range.
 * @param type - The health data type to query (e.g., 'steps', 'heartRate').
 * @param options - Query options including date range, limit, sort order, and aggregation.
 * @returns An array of HealthSample objects matching the query.
 */
export async function querySamples(
  type: HealthDataType,
  options: HealthQueryOptions,
): Promise<HealthSample[]> {
  return getProvider().querySamples(type, options)
}

/**
 * Get aggregated statistics (sum, average, min, max, count) for a health data type.
 * @param type - The health data type to aggregate (e.g., 'steps', 'activeEnergy').
 * @param options - Query options including date range and aggregation interval.
 * @returns An object with sum, average, min, max, and count statistics.
 */
export async function queryStatistics(
  type: HealthDataType,
  options: HealthQueryOptions,
): Promise<{
  sum?: number
  average?: number
  min?: number
  max?: number
  count: number
}> {
  return getProvider().queryStatistics(type, options)
}

/**
 * Write a health data sample to the health store.
 * @param sample - The health sample to write (type, value, unit, dates).
 * @returns A promise that resolves when the sample is written.
 */
export async function writeSample(
  sample: Omit<HealthSample, 'sourceName' | 'device'>,
): Promise<void> {
  return getProvider().writeSample(sample)
}

/**
 * Query workout sessions within a date range.
 * @param options - Query options including date range, limit, and sort order.
 * @returns An array of WorkoutSample objects.
 */
export async function queryWorkouts(options: HealthQueryOptions): Promise<WorkoutSample[]> {
  return getProvider().queryWorkouts(options)
}

/**
 * Write a workout session to the health store.
 * @param workout - The workout data (type, dates, duration, energy, distance, heart rate).
 * @returns A promise that resolves when the workout is written.
 */
export async function writeWorkout(workout: Omit<WorkoutSample, 'sourceName'>): Promise<void> {
  return getProvider().writeWorkout(workout)
}

/**
 * Query sleep analysis data within a date range.
 * @param options - Query options including date range, limit, and sort order.
 * @returns An array of SleepSample objects with stage breakdown.
 */
export async function querySleep(options: HealthQueryOptions): Promise<SleepSample[]> {
  return getProvider().querySleep(options)
}

/**
 * Delete health data samples of a given type within a date range.
 * @param type - The health data type whose samples to delete.
 * @param options - Query options specifying the date range of samples to delete.
 * @returns A promise that resolves when the samples are deleted.
 */
export async function deleteSamples(
  type: HealthDataType,
  options: HealthQueryOptions,
): Promise<void> {
  return getProvider().deleteSamples(type, options)
}

/**
 * Open the native health app (Apple Health or Google Fit).
 * @returns A promise that resolves when the health app is opened.
 */
export async function openHealthApp(): Promise<void> {
  return getProvider().openHealthApp()
}

/**
 * Get the platform's health data capabilities.
 * @returns The capabilities including supported data types, platform, and background delivery support.
 */
export async function getCapabilities(): Promise<HealthCapabilities> {
  return getProvider().getCapabilities()
}
