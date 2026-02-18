/**
 * Platform-specific code execution helpers.
 *
 * @module
 */

import { detectPlatform } from './detection.js'
import type { Platform } from './types.js'

/**
 * Executes a platform-specific handler based on the detected platform.
 * Falls back to the `default` handler if no handler matches.
 *
 * @param handlers - A map of platform identifiers to handler functions, with a required `default`.
 * @returns The return value of the matched (or default) handler.
 *
 * @example
 * ```typescript
 * const greeting = onPlatform({
 *   ios: () => 'Hello from iOS!',
 *   android: () => 'Hello from Android!',
 *   default: () => 'Hello from the web!',
 * })
 * ```
 */
export const onPlatform = <T>(
  handlers: Partial<Record<Platform, () => T>> & { default: () => T },
): T => {
  const currentPlatform = detectPlatform()
  const handler = handlers[currentPlatform] ?? handlers.default
  return handler()
}

/**
 * Checks if the current platform matches any of the specified platforms.
 *
 * @param platforms - One or more platform identifiers to check against.
 * @returns `true` if the current platform matches any of the given platforms.
 */
export const isPlatform = (...platforms: Platform[]): boolean => {
  return platforms.includes(detectPlatform())
}
