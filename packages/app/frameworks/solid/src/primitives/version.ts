/**
 * Solid.js primitives for version and update management.
 *
 * @module
 */

import { type Accessor, createSignal, onCleanup } from 'solid-js'

import type { UpdateCheckOptions, VersionState } from '@molecule/app-version'
import { getProvider } from '@molecule/app-version'

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
 * import { createVersion } from '`@molecule/app-solid`'
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
  const provider = getProvider()

  const [state, setState] = createSignal<VersionState>(provider.getState())

  const events = [
    'update-available',
    'service-worker-waiting',
    'service-worker-activated',
    'check-start',
    'check-complete',
    'check-error',
  ] as const

  const unsubscribes = events.map((event) =>
    provider.on(event, () => {
      setState(provider.getState())
    }),
  )

  onCleanup(() => {
    unsubscribes.forEach((unsub) => unsub())
  })

  return {
    state,
    isUpdateAvailable: () => state().isUpdateAvailable,
    isChecking: () => state().isChecking,
    isServiceWorkerWaiting: () => state().isServiceWorkerWaiting,
    newVersion: () => state().newVersion,
    checkForUpdates: () => provider.checkForUpdates(),
    applyUpdate: (options?) => provider.applyUpdate(options),
    dismissUpdate: () => provider.dismissUpdate(),
    startPeriodicChecks: (options?) => provider.startPeriodicChecks(options),
    stopPeriodicChecks: () => provider.stopPeriodicChecks(),
  }
}
