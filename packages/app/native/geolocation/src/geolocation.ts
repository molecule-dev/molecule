/**
 * Geolocation convenience functions for molecule.dev.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type {
  ErrorCallback,
  LocationPermission,
  Position,
  PositionCallback,
  PositionOptions,
  WatchOptions,
} from './types.js'

/**
 * Checks the current location permission status.
 * @returns The current location permission state.
 */
export const checkPermission = (): Promise<LocationPermission> => getProvider().checkPermission()

/**
 * Requests location permission from the user.
 * @returns The resulting permission state after the request.
 */
export const requestPermission = (): Promise<LocationPermission> =>
  getProvider().requestPermission()

/**
 * Gets the device's current geographic position.
 * @param options - Configuration for accuracy, timeout, and caching behavior.
 * @returns The current position with coordinates and timestamp.
 */
export const getCurrentPosition = (options?: PositionOptions): Promise<Position> =>
  getProvider().getCurrentPosition(options)

/**
 * Watches for continuous position changes.
 * @param onSuccess - Callback invoked with each new position update.
 * @param onError - Callback invoked when a geolocation error occurs.
 * @param options - Configuration for accuracy, distance filter, and timing.
 * @returns A watch identifier that can be passed to {@link clearWatch} to stop watching.
 */
export const watchPosition = (
  onSuccess: PositionCallback,
  onError?: ErrorCallback,
  options?: WatchOptions,
): string => getProvider().watchPosition(onSuccess, onError, options)

/**
 * Stops watching position changes for the given watch.
 * @param watchId - The identifier returned by {@link watchPosition}.
 * @returns void
 */
export const clearWatch = (watchId: string): void => getProvider().clearWatch(watchId)

/**
 * Calculates the distance between two geographic coordinates.
 * @param from - The starting coordinate.
 * @param from.latitude - The starting latitude in decimal degrees.
 * @param from.longitude - The starting longitude in decimal degrees.
 * @param to - The destination coordinate.
 * @param to.latitude - The destination latitude in decimal degrees.
 * @param to.longitude - The destination longitude in decimal degrees.
 * @returns The distance in meters between the two coordinates.
 */
export const calculateDistance = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number => getProvider().calculateDistance(from, to)
