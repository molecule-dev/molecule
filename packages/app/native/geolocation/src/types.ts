/**
 * Geolocation type definitions for molecule.dev.
 *
 * @module
 */

/**
 * Geographic coordinates (latitude, longitude, accuracy, altitude, heading, speed).
 */
export interface Coordinates {
  /**
   * Latitude in decimal degrees.
   */
  latitude: number

  /**
   * Longitude in decimal degrees.
   */
  longitude: number

  /**
   * Accuracy in meters.
   */
  accuracy: number

  /**
   * Altitude in meters (if available).
   */
  altitude?: number

  /**
   * Altitude accuracy in meters (if available).
   */
  altitudeAccuracy?: number

  /**
   * Heading in degrees (0-360, if available).
   */
  heading?: number

  /**
   * Speed in m/s (if available).
   */
  speed?: number
}

/**
 * Geolocation position containing coordinates and a timestamp.
 */
export interface Position {
  /**
   * Geographic coordinates.
   */
  coords: Coordinates

  /**
   * Timestamp of the position.
   */
  timestamp: number
}

/**
 * Options for position queries (high accuracy mode, max cached age, timeout).
 */
export interface PositionOptions {
  /**
   * Enable high accuracy mode.
   */
  enableHighAccuracy?: boolean

  /**
   * Maximum age of cached position in ms.
   */
  maximumAge?: number

  /**
   * Timeout in ms.
   */
  timeout?: number
}

/**
 * Watch options (extends position options).
 */
export interface WatchOptions extends PositionOptions {
  /**
   * Minimum distance change in meters before triggering update.
   */
  distanceFilter?: number
}

/**
 * Geolocation error with code (permission_denied, position_unavailable, timeout) and message.
 */
export interface GeolocationError {
  /**
   * Error code.
   */
  code: 'permission_denied' | 'position_unavailable' | 'timeout' | 'unknown'

  /**
   * Error message.
   */
  message: string
}

/**
 * Location permission state: granted, denied, or prompt (not yet requested).
 */
export type LocationPermission = 'granted' | 'denied' | 'prompt'

/**
 * Callback invoked with a resolved geographic position.
 * @param position - The resolved geographic position data.
 */
export type PositionCallback = (position: Position) => void

/**
 * Callback invoked when a geolocation error occurs.
 */
export type ErrorCallback = (error: GeolocationError) => void

/**
 * Geolocation provider interface.
 *
 * All geolocation providers must implement this interface.
 */
export interface GeolocationProvider {
  /**
   * Checks the current permission status.
   * @returns The current location permission state.
   */
  checkPermission(): Promise<LocationPermission>

  /**
   * Requests location permission.
   */
  requestPermission(): Promise<LocationPermission>

  /**
   * Gets the current position.
   */
  getCurrentPosition(options?: PositionOptions): Promise<Position>

  /**
   * Watches position changes.
   * Returns an ID that can be used to stop watching.
   */
  watchPosition(
    onSuccess: PositionCallback,
    onError?: ErrorCallback,
    options?: WatchOptions,
  ): string

  /**
   * Stops watching position changes.
   */
  clearWatch(watchId: string): void

  /**
   * Calculates distance between two coordinates in meters.
   * @returns The distance in meters between the two coordinates.
   */
  calculateDistance(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ): number
}
