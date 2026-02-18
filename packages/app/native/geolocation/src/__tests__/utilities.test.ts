import { describe, expect, it } from 'vitest'

import { haversineDistance, toRadians } from '../utilities.js'

describe('geolocation/utilities', () => {
  describe('toRadians', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(toRadians(0)).toBe(0)
    })

    it('should convert 180 degrees to PI radians', () => {
      expect(toRadians(180)).toBeCloseTo(Math.PI)
    })

    it('should convert 90 degrees to PI/2 radians', () => {
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2)
    })

    it('should convert 360 degrees to 2*PI radians', () => {
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI)
    })

    it('should handle negative degrees', () => {
      expect(toRadians(-90)).toBeCloseTo(-Math.PI / 2)
    })
  })

  describe('haversineDistance', () => {
    it('should return 0 for same coordinates', () => {
      const point = { latitude: 37.7749, longitude: -122.4194 }
      const distance = haversineDistance(point, point)
      expect(distance).toBe(0)
    })

    it('should calculate distance between San Francisco and Los Angeles', () => {
      const sf = { latitude: 37.7749, longitude: -122.4194 }
      const la = { latitude: 34.0522, longitude: -118.2437 }
      const distance = haversineDistance(sf, la)

      // Distance should be approximately 559 km (559000 meters)
      expect(distance).toBeGreaterThan(550000)
      expect(distance).toBeLessThan(570000)
    })

    it('should calculate distance between New York and London', () => {
      const ny = { latitude: 40.7128, longitude: -74.006 }
      const london = { latitude: 51.5074, longitude: -0.1278 }
      const distance = haversineDistance(ny, london)

      // Distance should be approximately 5570 km (5570000 meters)
      expect(distance).toBeGreaterThan(5500000)
      expect(distance).toBeLessThan(5600000)
    })

    it('should calculate short distances accurately', () => {
      // Two points approximately 100 meters apart
      const point1 = { latitude: 37.7749, longitude: -122.4194 }
      const point2 = { latitude: 37.7758, longitude: -122.4194 } // ~100m north
      const distance = haversineDistance(point1, point2)

      expect(distance).toBeGreaterThan(90)
      expect(distance).toBeLessThan(110)
    })

    it('should be symmetric', () => {
      const point1 = { latitude: 37.7749, longitude: -122.4194 }
      const point2 = { latitude: 34.0522, longitude: -118.2437 }

      const distance1 = haversineDistance(point1, point2)
      const distance2 = haversineDistance(point2, point1)

      expect(distance1).toBeCloseTo(distance2)
    })

    it('should handle coordinates at the equator', () => {
      const point1 = { latitude: 0, longitude: 0 }
      const point2 = { latitude: 0, longitude: 1 }
      const distance = haversineDistance(point1, point2)

      // 1 degree at equator is approximately 111 km
      expect(distance).toBeGreaterThan(110000)
      expect(distance).toBeLessThan(112000)
    })

    it('should handle coordinates at the poles', () => {
      const northPole = { latitude: 90, longitude: 0 }
      const southPole = { latitude: -90, longitude: 0 }
      const distance = haversineDistance(northPole, southPole)

      // Half the Earth's circumference is approximately 20000 km
      expect(distance).toBeGreaterThan(19500000)
      expect(distance).toBeLessThan(20500000)
    })
  })
})
