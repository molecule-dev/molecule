/**
 * Svelte hook for version and update management, porting React's `useVersion`.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { UpdateCheckOptions, VersionState } from '@molecule/app-version'
import { getProvider } from '@molecule/app-version'

import { useSyncExternalStore } from './external-store.js'
import { fieldStore } from './live-store.js'

/**
 * Hook return type.
 */
export interface UseVersionResult {
  /** The provider's full state. */
  state: Readable<VersionState>
  /** Whether an update is available. */
  isUpdateAvailable: Readable<boolean>
  /** Whether a check is running. */
  isChecking: Readable<boolean>
  /** Whether a service worker waits to activate. */
  isServiceWorkerWaiting: Readable<boolean>
  /** The version an available update reports. */
  newVersion: Readable<string | undefined>
  /** Checks the provider for an update. */
  checkForUpdates: () => Promise<boolean>
  /** Applies an available update. */
  applyUpdate: (options?: { force?: boolean }) => void
  /** Hides an available update. */
  dismissUpdate: () => void
  /** Starts polling the provider for updates. */
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  /** Stops the polling. */
  stopPeriodicChecks: () => void
}

/**
 * Version state and update actions, React's `useVersion` in Svelte's idiom: a
 * readable store per value field and plain functions for the actions, created
 * during component init.
 *
 * Uses module-level `getProvider()` — version is a singleton, not
 * context-provided.
 *
 * @returns Version state and action methods.
 * @example
 * ```svelte
 * <script>
 *   import { useVersion } from '@molecule/app-svelte'
 *   const { isUpdateAvailable, newVersion, applyUpdate, dismissUpdate } = useVersion()
 * </script>
 * ```
 */
export function useVersion(): UseVersionResult {
  const provider = getProvider()

  // Cached previous state (React's cachedStateRef): a snapshot whose tracked
  // fields all match the provider's keeps the previous object, so the value is
  // referentially stable and no notification publishes a fresh copy.
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

  const state = useSyncExternalStore<VersionState>((onChange) => {
    const unsubs = [
      provider.on('update-available', onChange),
      provider.on('service-worker-waiting', onChange),
      provider.on('service-worker-activated', onChange),
      provider.on('check-start', onChange),
      provider.on('check-complete', onChange),
      provider.on('check-error', onChange),
    ]
    return () => unsubs.forEach((unsub) => unsub())
  }, getSnapshot)

  return {
    state,
    isUpdateAvailable: fieldStore(state, 'isUpdateAvailable'),
    isChecking: fieldStore(state, 'isChecking'),
    isServiceWorkerWaiting: fieldStore(state, 'isServiceWorkerWaiting'),
    newVersion: fieldStore(state, 'newVersion'),
    checkForUpdates: () => provider.checkForUpdates(),
    applyUpdate: (options?: { force?: boolean }) => provider.applyUpdate(options),
    dismissUpdate: () => provider.dismissUpdate(),
    startPeriodicChecks: (options?: UpdateCheckOptions) => provider.startPeriodicChecks(options),
    stopPeriodicChecks: () => provider.stopPeriodicChecks(),
  }
}
