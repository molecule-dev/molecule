/**
 * Motion utility functions for molecule.dev.
 *
 * @module
 */

import { startAccelerometer } from './provider.js'
import type { AccelerometerData, SensorOptions, ShakeOptions, Vector3D } from './types.js'

/**
 * Calculate the magnitude (length) of a 3D vector.
 * @param v - The 3D vector with x, y, z components.
 * @returns The Euclidean magnitude of the vector.
 */
export function magnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

/**
 * Normalize a 3D vector to unit length. Returns a zero vector if the input has zero magnitude.
 * @param v - The 3D vector to normalize.
 * @returns A new Vector3D with unit length pointing in the same direction.
 */
export function normalize(v: Vector3D): Vector3D {
  const mag = magnitude(v)
  if (mag === 0) return { x: 0, y: 0, z: 0 }
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag }
}

/**
 * Calculate the dot product of two 3D vectors.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns The scalar dot product (a.x*b.x + a.y*b.y + a.z*b.z).
 */
export function dot(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/**
 * Calculate the cross product of two 3D vectors.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns A new Vector3D perpendicular to both input vectors.
 */
export function cross(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

/**
 * Create a shake gesture detector that uses accelerometer data to detect device shaking.
 * @param onShake - Called when a shake gesture is detected.
 * @param options - Shake detection options (threshold, minimum shakes, time window).
 * @returns A controller with `start` and `stop` methods for the shake detector.
 */
export function createShakeDetector(
  onShake: () => void,
  options?: ShakeOptions,
): { start: () => void; stop: () => void } {
  const threshold = options?.threshold ?? 15
  const minShakes = options?.minShakes ?? 3
  const timeWindow = options?.timeWindow ?? 1000

  let shakeEvents: number[] = []
  let lastMagnitude = 0
  let stopFn: (() => void) | null = null

  const processAcceleration = (data: AccelerometerData): void => {
    const mag = magnitude(data)
    const deltaMag = Math.abs(mag - lastMagnitude)
    lastMagnitude = mag

    if (deltaMag > threshold) {
      const now = Date.now()
      shakeEvents.push(now)

      // Remove old events
      shakeEvents = shakeEvents.filter((t) => now - t < timeWindow)

      if (shakeEvents.length >= minShakes) {
        onShake()
        shakeEvents = []
      }
    }
  }

  return {
    start() {
      if (!stopFn) {
        stopFn = startAccelerometer(processAcceleration, { frequency: 30 })
      }
    },
    stop() {
      if (stopFn) {
        stopFn()
        stopFn = null
      }
      shakeEvents = []
    },
  }
}

/**
 * Create a tilt detector that calculates pitch and roll angles from accelerometer data.
 * @param onChange - Called with pitch (front-back tilt) and roll (left-right tilt) angles in degrees.
 * @param options - Sensor options (sampling frequency).
 * @returns A controller with `start` and `stop` methods for the tilt detector.
 */
export function createTiltDetector(
  onChange: (tilt: { pitch: number; roll: number }) => void,
  options?: SensorOptions,
): { start: () => void; stop: () => void } {
  let stopFn: (() => void) | null = null

  return {
    start() {
      if (!stopFn) {
        stopFn = startAccelerometer((data) => {
          // Calculate pitch (front-back tilt)
          const pitch = Math.atan2(data.y, data.z) * (180 / Math.PI)
          // Calculate roll (left-right tilt)
          const roll = Math.atan2(data.x, data.z) * (180 / Math.PI)

          onChange({ pitch, roll })
        }, options)
      }
    },
    stop() {
      if (stopFn) {
        stopFn()
        stopFn = null
      }
    },
  }
}

/**
 * Create a basic step counter using accelerometer peak detection.
 * @param onStep - Called with the cumulative step count each time a step is detected.
 * @returns A controller with `start`, `stop`, `getCount`, and `reset` methods.
 */
export function createStepCounter(onStep: (count: number) => void): {
  start: () => void
  stop: () => void
  getCount: () => number
  reset: () => void
} {
  let stepCount = 0
  let lastPeak = 0
  let lastValley = 0
  let stopFn: (() => void) | null = null
  const threshold = 1.2 // Minimum acceleration change for step

  return {
    start() {
      if (!stopFn) {
        stopFn = startAccelerometer(
          (data) => {
            const mag = magnitude(data)

            // Simple peak detection
            if (mag > lastPeak && mag > 10 + threshold) {
              if (lastPeak - lastValley > threshold) {
                stepCount++
                onStep(stepCount)
              }
              lastValley = mag
            }

            if (mag < lastValley) {
              lastValley = mag
            }

            lastPeak = mag
          },
          { frequency: 30 },
        )
      }
    },
    stop() {
      if (stopFn) {
        stopFn()
        stopFn = null
      }
    },
    getCount() {
      return stepCount
    },
    reset() {
      stepCount = 0
    },
  }
}
