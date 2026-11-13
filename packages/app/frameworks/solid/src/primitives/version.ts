/**
 * Solid.js primitives for version and update management.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { UpdateCheckOptions, VersionState } from '@molecule/app-version'
import { getProvider } from '@molecule/app-version'

import { useSyncExternalStore } from './external-store.js'

/**
 * Version primitives return type.
 */
export interface VersionPrimitives {
  state: Accessor<VersionState>
  isUpdateAvailable: Accessor<boolean>
  isChecking: Accessor<boolean>
  isServiceWorkerWaiting: Accessor<boolean>
  newVersion: Accessor<string | undefined>
  checkForUpdates: () => Promise<boolean>
  applyUpdate: (options?: { force?: boolean }) => void
  dismissUpdate: () => void
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  stopPeriodicChecks: () => void
}

/**
 * Create version primitives for tracking app updates.
 *
 * @returns Version primitives object
 *
 * @example
 * ```tsx
 * import { createVersion } from '@molecule/app-solid'
 *
 * function UpdateBanner() {
 *   const { isUpdateAvailable, newVersion, applyUpdate, dismissUpdate } = createVersion()
 *
 *   return (
 *     <Show when={isUpdateAvailable()}>
 *       <div>
 *         <span>Version {newVersion()} is available!</span>
 *         <button onClick={() => applyUpdate()}>Update</button>
 *         <button onClick={() => dismissUpdate()}>Dismiss</button>
 *       </div>
 *     </Show>
 *   )
 * }
 * ```
 */
export function createVersion(): VersionPrimitives {
  return useVersion()
}

/**
 * Version and update state, under React's hook name: the state fields as
 * accessors over the bonded provider's snapshot (refreshed on the same six
 * events React subscribes) and the actions as plain functions.
 *
 * Uses module-level `getProvider()` — version is a singleton, not
 * context-provided.
 *
 * @returns Version state and action methods.
 * @example
 * ```tsx
 * const { isUpdateAvailable, newVersion, applyUpdate } = useVersion()
 * <Show when={isUpdateAvailable()}>
 *   <span>Version {newVersion()} is available!</span>
 * </Show>
 * ```
 */
export function useVersion(): VersionPrimitives {
  const provider = getProvider()

  // Cached snapshot for stability (React's cachedStateRef): a state whose
  // tracked fields all match keeps the previous object.
  let cachedState: VersionState | null = null

  const getSnapshot = (): VersionState => {
    const next = provider.getState()
    const prev = cachedState
    if (
      prev !== null &&
      prev.isUpdateAvailable === next.isUpdateAvailable &&
      prev.isChecking === next.isChecking &&
      prev.isServiceWorkerWaiting === next.isServiceWorkerWaiting &&
      prev.newVersion === next.newVersion &&
      prev.buildId === next.buildId &&
      prev.version === next.version
    ) {
      return prev
    }
    cachedState = next
    return next
  }

  const state = useSyncExternalStore((onStateChange) => {
    const unsubs = [
      provider.on('update-available', onStateChange),
      provider.on('service-worker-waiting', onStateChange),
      provider.on('service-worker-activated', onStateChange),
      provider.on('check-start', onStateChange),
      provider.on('check-complete', onStateChange),
      provider.on('check-error', onStateChange),
    ]
    return () => unsubs.forEach((unsub) => unsub())
  }, getSnapshot)

  return {
    state,
    isUpdateAvailable: () => state().isUpdateAvailable,
    isChecking: () => state().isChecking,
    isServiceWorkerWaiting: () => state().isServiceWorkerWaiting,
    newVersion: () => state().newVersion,
    checkForUpdates: () => provider.checkForUpdates(),
    applyUpdate: (options?: { force?: boolean }) => provider.applyUpdate(options),
    dismissUpdate: () => provider.dismissUpdate(),
    startPeriodicChecks: (options?: UpdateCheckOptions) => provider.startPeriodicChecks(options),
    stopPeriodicChecks: () => provider.stopPeriodicChecks(),
  }
}
