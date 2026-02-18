/**
 * Motion provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type {
  AccelerometerData,
  GyroscopeData,
  MagnetometerData,
  MotionCapabilities,
  MotionData,
  MotionPermissionStatus,
  MotionProvider,
  OrientationData,
  SensorOptions,
} from './types.js'

const BOND_TYPE = 'motion'

/**
 * Set the motion provider.
 * @param provider - MotionProvider implementation to register.
 */
export function setProvider(provider: MotionProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current motion provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active MotionProvider instance.
 */
export function getProvider(): MotionProvider {
  const provider = bondGet<MotionProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('motion.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-motion: No provider set. Call setProvider() with a MotionProvider implementation (e.g., from @molecule/app-motion-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a motion provider has been registered.
 * @returns Whether a MotionProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Start receiving accelerometer data updates.
 * @param callback - Called with AccelerometerData on each sensor reading.
 * @param options - Sensor options (sampling frequency).
 * @returns A function that stops the accelerometer updates when called.
 */
export function startAccelerometer(
  callback: (data: AccelerometerData) => void,
  options?: SensorOptions,
): () => void {
  return getProvider().startAccelerometer(callback, options)
}

/**
 * Start receiving gyroscope data updates.
 * @param callback - Called with GyroscopeData on each sensor reading.
 * @param options - Sensor options (sampling frequency).
 * @returns A function that stops the gyroscope updates when called.
 */
export function startGyroscope(
  callback: (data: GyroscopeData) => void,
  options?: SensorOptions,
): () => void {
  return getProvider().startGyroscope(callback, options)
}

/**
 * Start receiving magnetometer data updates.
 * @param callback - Called with MagnetometerData on each sensor reading.
 * @param options - Sensor options (sampling frequency).
 * @returns A function that stops the magnetometer updates when called.
 */
export function startMagnetometer(
  callback: (data: MagnetometerData) => void,
  options?: SensorOptions,
): () => void {
  return getProvider().startMagnetometer(callback, options)
}

/**
 * Start receiving device orientation updates.
 * @param callback - Called with OrientationData (alpha, beta, gamma angles) on each reading.
 * @param options - Sensor options (sampling frequency).
 * @returns A function that stops the orientation updates when called.
 */
export function startOrientation(
  callback: (data: OrientationData) => void,
  options?: SensorOptions,
): () => void {
  return getProvider().startOrientation(callback, options)
}

/**
 * Start receiving combined motion data (accelerometer, gyroscope, orientation).
 * @param callback - Called with combined MotionData on each reading.
 * @param options - Sensor options (sampling frequency).
 * @returns A function that stops the motion updates when called.
 */
export function startMotion(
  callback: (data: MotionData) => void,
  options?: SensorOptions,
): () => void {
  return getProvider().startMotion(callback, options)
}

/**
 * Get the current accelerometer reading.
 * @returns The current accelerometer data with x, y, z values and timestamp.
 */
export async function getAccelerometer(): Promise<AccelerometerData> {
  return getProvider().getAccelerometer()
}

/**
 * Get the current gyroscope reading.
 * @returns The current gyroscope data with x, y, z rotation rates and timestamp.
 */
export async function getGyroscope(): Promise<GyroscopeData> {
  return getProvider().getGyroscope()
}

/**
 * Get the current device orientation reading.
 * @returns The current orientation data with alpha, beta, gamma angles and timestamp.
 */
export async function getOrientation(): Promise<OrientationData> {
  return getProvider().getOrientation()
}

/**
 * Get the motion sensor permission status.
 * @returns The permission status: 'granted', 'denied', 'prompt', or 'unsupported'.
 */
export async function getPermissionStatus(): Promise<MotionPermissionStatus> {
  return getProvider().getPermissionStatus()
}

/**
 * Request motion sensor permission (required on iOS 13+).
 * @returns The resulting permission status after the request.
 */
export async function requestPermission(): Promise<MotionPermissionStatus> {
  return getProvider().requestPermission()
}

/**
 * Get the platform's motion sensor capabilities.
 * @returns The capabilities indicating which sensors are available.
 */
export async function getCapabilities(): Promise<MotionCapabilities> {
  return getProvider().getCapabilities()
}
