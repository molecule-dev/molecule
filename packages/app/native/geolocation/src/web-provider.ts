/**
 * Web-based geolocation provider for molecule.dev.
 *
 * @module
 */

import type {
  ErrorCallback,
  GeolocationError,
  GeolocationProvider,
  LocationPermission,
  Position,
  PositionCallback,
  PositionOptions,
  WatchOptions,
} from './types.js'
import { haversineDistance } from './utilities.js'

/**
 * Translation function signature compatible with `@molecule/app-i18n`.
 */
type TranslateFn = (
  key: string,
  values?: Record<string, unknown>,
  options?: { defaultValue?: string },
) => string

/**
 * Options for creating a web geolocation provider.
 */
export interface CreateWebGeolocationProviderOptions {
  /**
   * Optional translation function for i18n support.
   * When provided, error messages will be passed through this function.
   */
  t?: TranslateFn
}

/**
 * Creates a web-based geolocation provider using the browser Geolocation API.
 * @param options - Provider configuration including optional i18n translation function.
 * @returns A {@link GeolocationProvider} backed by the browser Geolocation API.
 */
export const createWebGeolocationProvider = (
  options?: CreateWebGeolocationProviderOptions,
): GeolocationProvider => {
  const msg = (key: string, defaultValue: string): string =>
    options?.t ? options.t(key, undefined, { defaultValue }) : defaultValue
  const watchIds = new Map<string, number>()

  const convertError = (error: globalThis.GeolocationPositionError): GeolocationError => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return { code: 'permission_denied', message: error.message }
      case error.POSITION_UNAVAILABLE:
        return { code: 'position_unavailable', message: error.message }
      case error.TIMEOUT:
        return { code: 'timeout', message: error.message }
      default:
        return { code: 'unknown', message: error.message }
    }
  }

  const convertPosition = (position: globalThis.GeolocationPosition): Position => ({
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
      heading: position.coords.heading ?? undefined,
      speed: position.coords.speed ?? undefined,
    },
    timestamp: position.timestamp,
  })

  return {
    async checkPermission(): Promise<LocationPermission> {
      if (!('permissions' in navigator)) {
        // Fallback: try to get position to determine permission
        return 'prompt'
      }

      try {
        const result = await navigator.permissions.query({ name: 'geolocation' })
        return result.state as LocationPermission
      } catch {
        return 'prompt'
      }
    },

    async requestPermission(): Promise<LocationPermission> {
      // Web API doesn't have explicit permission request
      // We trigger it by requesting a position
      try {
        await this.getCurrentPosition({ timeout: 5000 })
        return 'granted'
      } catch (error) {
        const geoError = error as GeolocationError
        if (geoError.code === 'permission_denied') {
          return 'denied'
        }
        // Could be timeout or unavailable, but permission might still be granted
        return this.checkPermission()
      }
    },

    getCurrentPosition(options?: PositionOptions): Promise<Position> {
      return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject({
            code: 'position_unavailable',
            message: msg('geolocation.error.notSupported', 'Geolocation not supported'),
          })
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => resolve(convertPosition(position)),
          (error) => reject(convertError(error)),
          {
            enableHighAccuracy: options?.enableHighAccuracy,
            maximumAge: options?.maximumAge,
            timeout: options?.timeout,
          },
        )
      })
    },

    watchPosition(
      onSuccess: PositionCallback,
      onError?: ErrorCallback,
      options?: WatchOptions,
    ): string {
      if (!('geolocation' in navigator)) {
        onError?.({
          code: 'position_unavailable',
          message: msg('geolocation.error.notSupported', 'Geolocation not supported'),
        })
        return ''
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => onSuccess(convertPosition(position)),
        (error) => onError?.(convertError(error)),
        {
          enableHighAccuracy: options?.enableHighAccuracy,
          maximumAge: options?.maximumAge,
          timeout: options?.timeout,
        },
      )

      const id = Math.random().toString(36).slice(2)
      watchIds.set(id, watchId)
      return id
    },

    clearWatch(watchId: string): void {
      const id = watchIds.get(watchId)
      if (id !== undefined) {
        navigator.geolocation.clearWatch(id)
        watchIds.delete(watchId)
      }
    },

    calculateDistance(
      from: { latitude: number; longitude: number },
      to: { latitude: number; longitude: number },
    ): number {
      return haversineDistance(from, to)
    },
  }
}
