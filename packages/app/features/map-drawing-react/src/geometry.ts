import type { MapDrawingBackend, ScreenPoint } from './types.js'

/**
 * Earth radius in meters — used by the great-circle distance fallback.
 */
const EARTH_RADIUS_METERS = 6378137

/**
 * Convert degrees to radians.
 *
 * @param degrees - Angle in degrees.
 * @returns Angle in radians.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Great-circle distance between two `[lng, lat]` positions in meters
 * using the Haversine formula. Matches the precision of the production
 * map backends so the radius computed during drag agrees with what the
 * backend will project back to the user.
 *
 * @param a - First position.
 * @param b - Second position.
 * @returns Distance in meters.
 */
export function haversineDistanceMeters(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const phi1 = toRadians(lat1)
  const phi2 = toRadians(lat2)
  const deltaPhi = toRadians(lat2 - lat1)
  const deltaLambda = toRadians(lng2 - lng1)
  const sinPhi = Math.sin(deltaPhi / 2)
  const sinLambda = Math.sin(deltaLambda / 2)
  const aTerm = sinPhi * sinPhi + Math.cos(phi1) * Math.cos(phi2) * sinLambda * sinLambda
  const cTerm = 2 * Math.atan2(Math.sqrt(aTerm), Math.sqrt(1 - aTerm))
  return EARTH_RADIUS_METERS * cTerm
}

/**
 * Identity drawing backend — used when no real map is mounted (tests,
 * SSR, demo storyboards). Projection is `lng → x`, `lat → y` so
 * fixtures can be authored in pixel space and round-trip cleanly. The
 * distance metric is Euclidean pixels rather than meters; callers that
 * care about a real radius should always pass a real backend.
 */
export const identityBackend: MapDrawingBackend = {
  project(coordinates) {
    return { x: coordinates[0], y: coordinates[1] }
  },
  unproject(point) {
    return [point.x, point.y]
  },
  distanceMeters(a, b) {
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    return Math.sqrt(dx * dx + dy * dy)
  },
}

/**
 * Snap an open ring (the in-progress polygon vertex list) into a
 * GeoJSON-compliant closed ring by repeating the first point at the
 * end. Returns `null` when the ring has fewer than three vertices,
 * since polygons require a minimum of three distinct points plus the
 * closing repeat.
 *
 * @param vertices - Open ring of `[lng, lat]` pairs.
 * @returns Closed ring, or `null` when there are not enough points.
 */
export function closeRing(vertices: [number, number][]): [number, number][] | null {
  if (vertices.length < 3) return null
  const first = vertices[0]
  const last = vertices[vertices.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return vertices.slice()
  }
  return [...vertices, [first[0], first[1]]]
}

/**
 * Check whether a screen-space point lies inside the given selection
 * rectangle (axis-aligned, inclusive bounds).
 *
 * @param point - Point under test.
 * @param a - One corner of the selection rectangle.
 * @param b - Opposite corner of the selection rectangle.
 * @returns `true` when the point lies inside the rectangle.
 */
export function pointInRect(point: ScreenPoint, a: ScreenPoint, b: ScreenPoint): boolean {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
}
