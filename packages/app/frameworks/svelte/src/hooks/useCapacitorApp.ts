/**
 * Svelte hook for Capacitor app initialization, porting React's
 * `useCapacitorApp`.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import type { Readable } from 'svelte/store'

import type { CapacitorAppOptions, CapacitorAppState } from '@molecule/app-platform'
import { createCapacitorApp } from '@molecule/app-platform'

import { fieldStore, liveStore } from './live-store.js'

/**
 * Hook return type.
 */
export type UseCapacitorAppResult = {
  /** Whether the app is fully initialized. */
  ready: Readable<boolean>
  /** Whether device ready has fired. */
  deviceReady: Readable<boolean>
  /** Whether push notifications are initialized. */
  pushReady: Readable<boolean>
  /** The initialization error, if any. */
  error: Readable<Error | null>
} & {
  /** Runs the coordinator's initialization again. */
  initialize: () => Promise<void>
}

/**
 * Capacitor app initialization state and actions, React's `useCapacitorApp` in
 * Svelte's idiom: called during component init, one coordinator per hook
 * instance whose state fields are readable stores and whose `initialize` is a
 * plain function.
 *
 * Creates the `CapacitorApp` coordinator during init, subscribes its state and
 * auto-initializes (the way React's mount effect does); the component's
 * destroy unsubscribes and calls `destroy()`, releasing the coordinator's
 * deep-link subscription. Init errors land in the `error` store through the
 * coordinator's own state, so the auto-init rejection is swallowed there.
 *
 * @param options - Capacitor app configuration options
 * @returns Current app state stores and an `initialize` function for manual
 *   re-initialization
 * @example
 * ```svelte
 * <script>
 *   import { useCapacitorApp } from '@molecule/app-svelte'
 *   const { ready, error } = useCapacitorApp({ pushNotifications: true })
 * </script>
 *
 * {#if $ready} <p>Ready</p> {:else if $error} <p>{$error.message}</p> {/if}
 * ```
 */
export function useCapacitorApp(options: CapacitorAppOptions = {}): UseCapacitorAppResult {
  const app = createCapacitorApp(options)
  // Registered BEFORE the state store's teardown so teardown runs in React's
  // order: unsubscribe first (LIFO), then the coordinator's destroy().
  onDestroy(() => {
    app.destroy()
  })

  const state = liveStore<CapacitorAppState>(
    () => app.getState(),
    (notify) => app.subscribe(notify),
  )

  // Auto-initialize (React's mount effect): the coordinator reports a failed
  // init through its state, so the rejection itself is swallowed here.
  void app.initialize().catch((_error: unknown) => {
    // The coordinator puts the error in state, which this hook returns.
  })

  return {
    ready: fieldStore(state, 'ready'),
    deviceReady: fieldStore(state, 'deviceReady'),
    pushReady: fieldStore(state, 'pushReady'),
    error: fieldStore(state, 'error'),
    initialize: async (): Promise<void> => {
      await app.initialize()
    },
  }
}
