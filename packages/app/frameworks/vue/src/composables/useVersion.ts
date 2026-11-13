/**
 * Vue composable for version and update management.
 *
 * @module
 */

import { computed, type ComputedRef, getCurrentScope, onScopeDispose } from 'vue'

import type { UpdateCheckOptions, VersionEvent, VersionState } from '@molecule/app-version'
import { getProvider } from '@molecule/app-version'

import { subscribeExternalSnapshot } from './external-snapshot.js'

/**
 * Return type for the useVersion composable.
 */
export interface UseVersionReturn {
  state: ComputedRef<VersionState>
  isUpdateAvailable: ComputedRef<boolean>
  isChecking: ComputedRef<boolean>
  isServiceWorkerWaiting: ComputedRef<boolean>
  newVersion: ComputedRef<string | undefined>
  checkForUpdates: () => Promise<boolean>
  applyUpdate: (options?: { force?: boolean }) => void
  dismissUpdate: () => void
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  stopPeriodicChecks: () => void
}

/**
 * All version events to subscribe to.
 */
const VERSION_EVENTS: VersionEvent[] = [
  'update-available',
  'service-worker-waiting',
  'service-worker-activated',
  'check-start',
  'check-complete',
  'check-error',
]

/**
 * Composable for version and update management.
 *
 * Uses module-level getProvider() from `@molecule/app-version` (singleton).
 *
 *
 * @example
 * ```vue
 * <script setup>
 * import { useVersion } from '@molecule/app-vue'
 *
 * const { isUpdateAvailable, newVersion, applyUpdate, dismissUpdate } = useVersion()
 * </script>
 *
 * <template>
 *   <div v-if="isUpdateAvailable">
 *     New version {{ newVersion }} available!
 *     <button @click="applyUpdate()">Update</button>
 *     <button @click="dismissUpdate()">Dismiss</button>
 *   </div>
 * </template>
 * ```
 * @returns The result.
 */
export function useVersion(): UseVersionReturn {
  const provider = getProvider()

  // Cached snapshot: the provider hands out a new object per read, so equality
  // is decided field by field, exactly like React's getSnapshot cache.
  let cached: VersionState | null = null
  const read = (): VersionState => {
    const next = provider.getState()
    const previous = cached
    if (
      previous !== null &&
      previous.isUpdateAvailable === next.isUpdateAvailable &&
      previous.isChecking === next.isChecking &&
      previous.isServiceWorkerWaiting === next.isServiceWorkerWaiting &&
      previous.newVersion === next.newVersion &&
      previous.buildId === next.buildId &&
      previous.version === next.version
    ) {
      return previous
    }
    cached = next
    return next
  }

  const { state: versionState, unsubscribe } = subscribeExternalSnapshot(read, (onStateChange) => {
    const unsubs = VERSION_EVENTS.map((event) => provider.on(event, onStateChange))
    return () => unsubs.forEach((unsub) => unsub())
  })

  if (getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }

  const state = computed(() => versionState.value)
  const isUpdateAvailable = computed(() => versionState.value.isUpdateAvailable)
  const isChecking = computed(() => versionState.value.isChecking)
  const isServiceWorkerWaiting = computed(() => versionState.value.isServiceWorkerWaiting)
  const newVersion = computed(() => versionState.value.newVersion)

  const checkForUpdates = (): Promise<boolean> => provider.checkForUpdates()
  const applyUpdate = (options?: { force?: boolean }): void => provider.applyUpdate(options)
  const dismissUpdate = (): void => provider.dismissUpdate()
  const startPeriodicChecks = (options?: UpdateCheckOptions): void =>
    provider.startPeriodicChecks(options)
  const stopPeriodicChecks = (): void => provider.stopPeriodicChecks()

  return {
    state,
    isUpdateAvailable,
    isChecking,
    isServiceWorkerWaiting,
    newVersion,
    checkForUpdates,
    applyUpdate,
    dismissUpdate,
    startPeriodicChecks,
    stopPeriodicChecks,
  }
}
