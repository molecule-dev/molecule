/**
 * Svelte stores for version and update management.
 *
 * @module
 */

import { derived, type Readable, readable } from 'svelte/store'

import type { UpdateCheckOptions, VersionEvent, VersionState } from '@molecule/app-version'
import { getProvider } from '@molecule/app-version'

/**
 * Create version stores from the module-level version provider.
 *
 * @returns Version stores and actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createVersionStores } from '`@molecule/app-svelte`'
 *
 *   const { state, isUpdateAvailable, applyUpdate, dismissUpdate } = createVersionStores()
 * </script>
 *
 * {#if $isUpdateAvailable}
 *   <div>
 *     <p>New version available: {$newVersion}</p>
 *     <button on:click={() => applyUpdate()}>Update</button>
 *     <button on:click={dismissUpdate}>Dismiss</button>
 *   </div>
 * {/if}
 * ```
 */
export function createVersionStores(): {
  state: Readable<VersionState>
  isUpdateAvailable: Readable<boolean>
  isChecking: Readable<boolean>
  isServiceWorkerWaiting: Readable<boolean>
  newVersion: Readable<string | undefined>
  checkForUpdates: () => Promise<boolean>
  applyUpdate: (options?: { force?: boolean }) => void
  dismissUpdate: () => void
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  stopPeriodicChecks: () => void
} {
  const provider = getProvider()

  const events: VersionEvent[] = [
    'update-available',
    'service-worker-waiting',
    'service-worker-activated',
    'check-start',
    'check-complete',
    'check-error',
  ]

  // Main state store — subscribe to all version events
  const state: Readable<VersionState> = readable(
    provider.getState(),
    (set: (value: VersionState) => void) => {
      const unsubscribes = events.map((event) =>
        provider.on(event, () => {
          set(provider.getState())
        }),
      )

      return () => {
        unsubscribes.forEach((unsub) => unsub())
      }
    },
  )

  // Derived stores
  const isUpdateAvailable = derived(state, ($state: VersionState) => $state.isUpdateAvailable)
  const isChecking = derived(state, ($state: VersionState) => $state.isChecking)
  const isServiceWorkerWaiting = derived(
    state,
    ($state: VersionState) => $state.isServiceWorkerWaiting,
  )
  const newVersion = derived(state, ($state: VersionState) => $state.newVersion)

  // Actions
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
