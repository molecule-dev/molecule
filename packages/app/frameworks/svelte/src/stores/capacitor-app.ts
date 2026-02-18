/**
 * Svelte store for Capacitor app initialization.
 *
 * @module
 */

import { type Readable, readable } from 'svelte/store'

import type { CapacitorAppOptions, CapacitorAppState } from '@molecule/app-platform'
import { createCapacitorApp } from '@molecule/app-platform'

/**
 * Return type for the Capacitor app store.
 */
export type CapacitorAppStore = Readable<CapacitorAppState> & {
  initialize: () => Promise<void>
}

/**
 * Create a Svelte store wrapping the Capacitor app coordinator.
 *
 * Creates a CapacitorApp instance, subscribes to state changes,
 * and auto-initializes. The returned store is readable and also
 * exposes an `initialize` method for manual re-initialization.
 *
 * @param options - Capacitor app options
 * @returns A readable store of CapacitorAppState with an initialize method
 *
 * @example
 * ```svelte
 * <script>
 *   import { createCapacitorAppStore } from '`@molecule/app-svelte`'
 *
 *   const app = createCapacitorAppStore({
 *     pushNotifications: true,
 *     deepLinks: true,
 *     onDeepLink: (url) => console.log('Deep link:', url),
 *   })
 * </script>
 *
 * {#if $app.ready}
 *   <p>App is ready!</p>
 * {:else if $app.error}
 *   <p>Error: {$app.error.message}</p>
 * {:else}
 *   <p>Initializing...</p>
 * {/if}
 * ```
 */
export function createCapacitorAppStore(options?: CapacitorAppOptions): CapacitorAppStore {
  const app = createCapacitorApp(options)

  const store = readable<CapacitorAppState>(app.getState(), (set) => {
    const unsubscribe = app.subscribe((state) => {
      set(state)
    })

    // Auto-initialize
    app.initialize().catch(() => {
      // Errors are captured in state.error via the coordinator
    })

    return () => {
      unsubscribe()
      app.destroy()
    }
  })

  return {
    subscribe: store.subscribe,
    initialize: () => app.initialize(),
  }
}
