/**
 * Map utilities for molecule.dev.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type { Bounds, Coordinates } from './types.js'

/**
 * Default Mapbox style URLs for common map appearances.
 */
export const defaultStyles = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
  navigationDay: 'mapbox://styles/mapbox/navigation-day-v1',
  navigationNight: 'mapbox://styles/mapbox/navigation-night-v1',
}

/**
 * Calculate the Haversine distance between two geographic coordinates.
 * @param from - The starting coordinates.
 * @param to - The destination coordinates.
 * @returns The distance in meters.
 */
export const calculateDistance = (from: Coordinates, to: Coordinates): number => {
  const R = 6371e3 // Earth's radius in meters
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Calculate the geographic center (centroid) of multiple coordinates.
 * @param coordinates - Array of coordinates to average.
 * @returns The center point as a Coordinates object.
 */
export const calculateCenter = (coordinates: Coordinates[]): Coordinates => {
  if (coordinates.length === 0) {
    throw new Error(
      t('maps.error.emptyCenterCoordinates', undefined, {
        defaultValue: 'Cannot calculate center of empty coordinates array',
      }),
    )
  }

  const sumLat = coordinates.reduce((sum, c) => sum + c.lat, 0)
  const sumLng = coordinates.reduce((sum, c) => sum + c.lng, 0)

  return {
    lat: sumLat / coordinates.length,
    lng: sumLng / coordinates.length,
  }
}

/**
 * Calculate the bounding box that contains all given coordinates.
 * @param coordinates - Array of coordinates to compute bounds for.
 * @returns The southwest and northeast corners of the bounding box.
 */
export const calculateBounds = (coordinates: Coordinates[]): Bounds => {
  if (coordinates.length === 0) {
    throw new Error(
      t('maps.error.emptyBoundsCoordinates', undefined, {
        defaultValue: 'Cannot calculate bounds of empty coordinates array',
      }),
    )
  }

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const coord of coordinates) {
    minLat = Math.min(minLat, coord.lat)
    maxLat = Math.max(maxLat, coord.lat)
    minLng = Math.min(minLng, coord.lng)
    maxLng = Math.max(maxLng, coord.lng)
  }

  return {
    sw: { lat: minLat, lng: minLng },
    ne: { lat: maxLat, lng: maxLng },
  }
}

/**
 * Check if a coordinate point falls within a geographic bounding box.
 * @param coordinates - The point to test.
 * @param bounds - The bounding box with southwest and northeast corners.
 * @returns Whether the point is inside the bounds.
 */
export const isWithinBounds = (coordinates: Coordinates, bounds: Bounds): boolean => {
  return (
    coordinates.lat >= bounds.sw.lat &&
    coordinates.lat <= bounds.ne.lat &&
    coordinates.lng >= bounds.sw.lng &&
    coordinates.lng <= bounds.ne.lng
  )
}
