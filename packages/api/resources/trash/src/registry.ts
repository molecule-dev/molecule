/**
 * Restore-callback registry for HTTP-driven restores.
 *
 * The trash service is policy-light and does not know how to re-create
 * parent resources from snapshots — that logic belongs in each resource's
 * own package. This registry lets parent resources register a
 * {@link RestoreCallback} keyed by `resourceType` at startup, so the HTTP
 * `restore` handler can dispatch by resource type without baking concrete
 * resource imports into the trash package.
 *
 * Direct programmatic callers can pass a callback directly to
 * `restoreFromTrash()` instead — this registry exists only for the HTTP
 * route.
 *
 * @module
 */

import type { RestoreCallback } from './types.js'

const restoreCallbacks = new Map<string, RestoreCallback>()

/**
 * Registers a restore callback for a resource type.
 *
 * Subsequent calls with the same `resourceType` overwrite the previous
 * registration.
 *
 * @param resourceType - The resource type the callback handles.
 * @param callback - The callback to invoke when restoring rows of this type.
 */
export function registerRestoreCallback(resourceType: string, callback: RestoreCallback): void {
  restoreCallbacks.set(resourceType, callback)
}

/**
 * Returns the restore callback registered for a resource type, or
 * `undefined` if none has been registered.
 *
 * @param resourceType - The resource type to look up.
 * @returns The callback, or `undefined`.
 */
export function getRestoreCallback(resourceType: string): RestoreCallback | undefined {
  return restoreCallbacks.get(resourceType)
}

/**
 * Removes any registered restore callback for the given resource type.
 *
 * @param resourceType - The resource type whose callback should be removed.
 * @returns `true` if a callback was removed.
 */
export function unregisterRestoreCallback(resourceType: string): boolean {
  return restoreCallbacks.delete(resourceType)
}

/**
 * Clears all registered restore callbacks. Primarily useful in tests.
 */
export function clearRestoreCallbacks(): void {
  restoreCallbacks.clear()
}
