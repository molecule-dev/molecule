/**
 * `@molecule/app-screen-orientation`
 * Utility functions for orientation
 */

import { getState, isLocked, lock, unlock } from './orientation.js'
import type { OrientationLock, OrientationType } from './types.js'

/**
 * Checks whether the given orientation is a portrait variant.
 * @param orientation - The orientation type to check.
 * @returns Whether the orientation is portrait or portrait-primary/secondary.
 */
export function isPortrait(orientation: OrientationType): boolean {
  return orientation.startsWith('portrait')
}

/**
 * Checks whether the given orientation is a landscape variant.
 * @param orientation - The orientation type to check.
 * @returns Whether the orientation is landscape or landscape-primary/secondary.
 */
export function isLandscape(orientation: OrientationType): boolean {
  return orientation.startsWith('landscape')
}

/**
 * Converts a rotation angle to an orientation type.
 * @param angle - Rotation angle in degrees (0, 90, 180, 270).
 * @param naturalPortrait - Whether the device's natural orientation is portrait (default `true`).
 * @returns The orientation type corresponding to the given angle.
 */
export function orientationFromAngle(angle: number, naturalPortrait = true): OrientationType {
  const normalizedAngle = ((angle % 360) + 360) % 360

  if (naturalPortrait) {
    switch (normalizedAngle) {
      case 0:
        return 'portrait-primary'
      case 90:
        return 'landscape-primary'
      case 180:
        return 'portrait-secondary'
      case 270:
        return 'landscape-secondary'
      default:
        return 'portrait-primary'
    }
  } else {
    switch (normalizedAngle) {
      case 0:
        return 'landscape-primary'
      case 90:
        return 'portrait-primary'
      case 180:
        return 'landscape-secondary'
      case 270:
        return 'portrait-secondary'
      default:
        return 'landscape-primary'
    }
  }
}

/**
 * Converts an orientation type to a rotation angle.
 * @param orientation - The orientation type to convert.
 * @param naturalPortrait - Whether the device's natural orientation is portrait (default `true`).
 * @returns The rotation angle in degrees (0, 90, 180, or 270).
 */
export function angleFromOrientation(orientation: OrientationType, naturalPortrait = true): number {
  const angleMap: Record<OrientationType, number> = naturalPortrait
    ? {
        portrait: 0,
        'portrait-primary': 0,
        landscape: 90,
        'landscape-primary': 90,
        'portrait-secondary': 180,
        'landscape-secondary': 270,
      }
    : {
        landscape: 0,
        'landscape-primary': 0,
        portrait: 90,
        'portrait-primary': 90,
        'landscape-secondary': 180,
        'portrait-secondary': 270,
      }

  return angleMap[orientation] ?? 0
}

/**
 * Execute a callback while the screen is temporarily locked to a specific orientation.
 * Restores the previous lock state (or unlocks) after the callback completes.
 * @param orientation - The orientation to lock to during execution.
 * @param callback - The function to execute while orientation is locked. May be sync or async.
 * @returns The return value of the callback.
 */
export async function withOrientation<T>(
  orientation: OrientationLock,
  callback: () => T | Promise<T>,
): Promise<T> {
  const wasLocked = await isLocked()
  const previousState = await getState()

  try {
    await lock(orientation)
    return await callback()
  } finally {
    if (wasLocked && previousState.lockType) {
      await lock(previousState.lockType)
    } else {
      await unlock()
    }
  }
}

/**
 * Check if a current orientation satisfies an orientation lock constraint.
 * For example, 'portrait-primary' matches both 'portrait' and 'portrait-primary' locks.
 * @param current - The current orientation type.
 * @param lockType - The orientation lock to check against.
 * @returns Whether the current orientation satisfies the lock constraint.
 */
export function orientationMatchesLock(
  current: OrientationType,
  lockType: OrientationLock,
): boolean {
  switch (lockType) {
    case 'any':
    case 'natural':
      return true
    case 'portrait':
      return isPortrait(current)
    case 'landscape':
      return isLandscape(current)
    default:
      return current === lockType
  }
}
