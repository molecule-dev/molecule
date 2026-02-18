/**
 * Vue composable for version and update management.
 *
 * @module
 */

import { computed, type ComputedRef, onScopeDispose, shallowRef } from 'vue'

import type { UpdateCheckOptions, VersionEvent, VersionState } from '@molecule/app-version'
import { getProvider } from '@molecule/app-version'

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
 * import { useVersion } from '`@molecule/app-vue`'
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

  const versionState = shallowRef<VersionState>(provider.getState())

  const unsubscribers: Array<() => void> = []

  const refreshState = (): void => {
    versionState.value = provider.getState()
  }

  for (const event of VERSION_EVENTS) {
    const unsub = provider.on(event, refreshState)
    unsubscribers.push(unsub)
  }

  onScopeDispose(() => {
    for (const unsub of unsubscribers) {
      unsub()
    }
    unsubscribers.length = 0
  })

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
