/**
 * Geolocation utility functions for molecule.dev.
 *
 * @module
 */

/**
 * Converts degrees to radians.
 * @param degrees - The angle in degrees to convert.
 * @returns The angle in radians.
 */
export const toRadians = (degrees: number): number => degrees * (Math.PI / 180)

/**
 * Calculates the distance between two coordinates using the Haversine formula.
 * @param from - The starting coordinate.
 * @param from.latitude - The starting latitude in decimal degrees.
 * @param from.longitude - The starting longitude in decimal degrees.
 * @param to - The destination coordinate.
 * @param to.latitude - The destination latitude in decimal degrees.
 * @param to.longitude - The destination longitude in decimal degrees.
 * @returns The distance in meters between the two coordinates.
 */
export const haversineDistance = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number => {
  const R = 6371000 // Earth's radius in meters

  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
