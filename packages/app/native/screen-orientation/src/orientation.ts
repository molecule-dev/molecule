/**
 * `@molecule/app-screen-orientation`
 * Orientation convenience functions
 */

import { getProvider } from './provider.js'
import type {
  OrientationCapabilities,
  OrientationChangeEvent,
  OrientationLock,
  OrientationState,
  OrientationType,
  ScreenDimensions,
} from './types.js'

/**
 * Gets the current screen orientation.
 * @returns The current orientation type (e.g. 'portrait-primary', 'landscape-primary').
 */
export async function getOrientation(): Promise<OrientationType> {
  return getProvider().getOrientation()
}

/**
 * Gets the full orientation state including type, angle, and lock status.
 * @returns The current orientation state.
 */
export async function getState(): Promise<OrientationState> {
  return getProvider().getState()
}

/**
 * Gets the current screen dimensions, pixel ratio, and orientation mode.
 * @returns The screen dimensions and orientation flags.
 */
export async function getDimensions(): Promise<ScreenDimensions> {
  return getProvider().getDimensions()
}

/**
 * Locks the screen to the specified orientation.
 * @param orientation - The orientation constraint to apply (e.g. 'portrait', 'landscape').
 * @returns A promise that resolves when the orientation lock is applied.
 */
export async function lock(orientation: OrientationLock): Promise<void> {
  return getProvider().lock(orientation)
}

/**
 * Unlocks the screen orientation, allowing free rotation.
 * @returns A promise that resolves when the orientation lock is released.
 */
export async function unlock(): Promise<void> {
  return getProvider().unlock()
}

/**
 * Checks whether the screen orientation is currently locked.
 * @returns Whether the orientation is locked.
 */
export async function isLocked(): Promise<boolean> {
  return getProvider().isLocked()
}

/**
 * Subscribes to screen orientation change events.
 * @param callback - Invoked with the previous and current orientation on each change.
 * @returns An unsubscribe function to stop listening.
 */
export function onChange(callback: (event: OrientationChangeEvent) => void): () => void {
  return getProvider().onChange(callback)
}

/**
 * Gets the orientation capabilities of the current platform.
 * @returns The supported orientation features and lock types.
 */
export async function getCapabilities(): Promise<OrientationCapabilities> {
  return getProvider().getCapabilities()
}

/**
 * Convenience function to lock the screen to portrait orientation.
 * @returns A promise that resolves when the orientation is locked to portrait.
 */
export async function lockPortrait(): Promise<void> {
  return lock('portrait')
}

/**
 * Convenience function to lock the screen to landscape orientation.
 * @returns A promise that resolves when the orientation is locked to landscape.
 */
export async function lockLandscape(): Promise<void> {
  return lock('landscape')
}

/**
 * Locks the screen to whichever orientation family (portrait or landscape) is active.
 * @returns A promise that resolves when the current orientation is locked.
 */
export async function lockCurrent(): Promise<void> {
  const current = await getOrientation()
  if (current.startsWith('portrait')) {
    return lock('portrait')
  } else {
    return lock('landscape')
  }
}
