/**
 * React hook for version and update management.
 *
 * @module
 */

import { useCallback, useRef, useSyncExternalStore } from 'react'

import type { UpdateCheckOptions, VersionState } from '@molecule/app-version'
import { getProvider } from '@molecule/app-version'

/**
 * Hook return type.
 */
export interface UseVersionResult {
  state: VersionState
  isUpdateAvailable: boolean
  isChecking: boolean
  isServiceWorkerWaiting: boolean
  newVersion: string | undefined
  checkForUpdates: () => Promise<boolean>
  applyUpdate: (options?: { force?: boolean }) => void
  dismissUpdate: () => void
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  stopPeriodicChecks: () => void
}

/**
 * Hook for version state and update actions.
 *
 * Uses module-level `getProvider()` — version is a singleton, not context-provided.
 *
 * @returns Version state and action methods
 *
 * @example
 * ```tsx
 * const { isUpdateAvailable, newVersion, applyUpdate, dismissUpdate } = useVersion()
 *
 * if (isUpdateAvailable) {
 *   return <div>Update to {newVersion} available! <button onClick={() => applyUpdate()}>Update</button></div>
 * }
 * ```
 */
export function useVersion(): UseVersionResult {
  const provider = getProvider()

  // Cached ref for snapshot stability (prevents infinite re-renders with useSyncExternalStore)
  const cachedStateRef = useRef<VersionState | null>(null)

  const getSnapshot = useCallback(() => {
    const next = provider.getState()
    const prev = cachedStateRef.current
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
    cachedStateRef.current = next
    return next
  }, [provider])

  const subscribe = useCallback(
    (onStateChange: () => void) => {
      const unsubs = [
        provider.on('update-available', onStateChange),
        provider.on('service-worker-waiting', onStateChange),
        provider.on('service-worker-activated', onStateChange),
        provider.on('check-start', onStateChange),
        provider.on('check-complete', onStateChange),
        provider.on('check-error', onStateChange),
      ]
      return () => unsubs.forEach((unsub) => unsub())
    },
    [provider],
  )

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const checkForUpdates = useCallback(() => provider.checkForUpdates(), [provider])
  const applyUpdate = useCallback(
    (options?: { force?: boolean }) => provider.applyUpdate(options),
    [provider],
  )
  const dismissUpdate = useCallback(() => provider.dismissUpdate(), [provider])
  const startPeriodicChecks = useCallback(
    (options?: UpdateCheckOptions) => provider.startPeriodicChecks(options),
    [provider],
  )
  const stopPeriodicChecks = useCallback(() => provider.stopPeriodicChecks(), [provider])

  return {
    state,
    isUpdateAvailable: state.isUpdateAvailable,
    isChecking: state.isChecking,
    isServiceWorkerWaiting: state.isServiceWorkerWaiting,
    newVersion: state.newVersion,
    checkForUpdates,
    applyUpdate,
    dismissUpdate,
    startPeriodicChecks,
    stopPeriodicChecks,
  }
}
