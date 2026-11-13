/**
 * Angular function for version and update management, mirroring `useVersion`
 * from `@molecule/app-react`.
 *
 * @module
 */

import { computed, type Signal } from '@angular/core'

import type { UpdateCheckOptions, VersionState } from '@molecule/app-version'
import { getProvider } from '@molecule/app-version'

import { useExternalStore } from './external-store.js'

/**
 * What {@link useVersion} returns: every state field as a signal and every
 * update action as a plain function.
 */
export interface UseVersionResult {
  /** The full version state. */
  readonly state: Signal<VersionState>
  /** Whether an update is available. */
  readonly isUpdateAvailable: Signal<boolean>
  /** Whether an update check is running. */
  readonly isChecking: Signal<boolean>
  /** Whether a service worker waits to activate. */
  readonly isServiceWorkerWaiting: Signal<boolean>
  /** The version an available update reports. */
  readonly newVersion: Signal<string | undefined>
  /** Runs one update check; resolves with whether one was found. */
  checkForUpdates: () => Promise<boolean>
  /** Applies the update (the provider reloads the page). */
  applyUpdate: (options?: { force?: boolean }) => void
  /** Hides the update notice until the next check finds one. */
  dismissUpdate: () => void
  /** Starts periodic update checks. */
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  /** Stops periodic update checks. */
  stopPeriodicChecks: () => void
}

/**
 * Version state and update actions. Call it in an injection context (a
 * component field initializer or constructor).
 *
 * Uses module-level `getProvider()` — version is a singleton, not
 * registration-provided. The state snapshot is cached field-wise (like React's
 * hook), so a provider that builds a fresh object per read keeps the snapshot
 * stable between notifications.
 *
 * @returns Version state as signals and the update actions.
 */
export function useVersion(): UseVersionResult {
  const provider = getProvider()

  // Cached snapshot for stability: a provider may build a fresh object per
  // getState() call; the fields decide whether anything changed.
  let cachedState: VersionState | null = null

  const read = (): VersionState => {
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

  const state = useExternalStore(read, (onStateChange) => {
    const unsubs = [
      provider.on('update-available', onStateChange),
      provider.on('service-worker-waiting', onStateChange),
      provider.on('service-worker-activated', onStateChange),
      provider.on('check-start', onStateChange),
      provider.on('check-complete', onStateChange),
      provider.on('check-error', onStateChange),
    ]
    return () => unsubs.forEach((unsub) => unsub())
  })

  const checkForUpdates = (): Promise<boolean> => provider.checkForUpdates()
  const applyUpdate = (options?: { force?: boolean }): void => provider.applyUpdate(options)
  const dismissUpdate = (): void => provider.dismissUpdate()
  const startPeriodicChecks = (options?: UpdateCheckOptions): void =>
    provider.startPeriodicChecks(options)
  const stopPeriodicChecks = (): void => provider.stopPeriodicChecks()

  return {
    state,
    isUpdateAvailable: computed(() => state().isUpdateAvailable),
    isChecking: computed(() => state().isChecking),
    isServiceWorkerWaiting: computed(() => state().isServiceWorkerWaiting),
    newVersion: computed(() => state().newVersion),
    checkForUpdates,
    applyUpdate,
    dismissUpdate,
    startPeriodicChecks,
    stopPeriodicChecks,
  }
}
