/**
 * Solid.js primitives for Capacitor app initialization.
 *
 * @module
 */

import { type Accessor, createSignal, onCleanup } from 'solid-js'

import type { CapacitorAppOptions, CapacitorAppState } from '@molecule/app-platform'
import { createCapacitorApp as createCapacitorAppCore } from '@molecule/app-platform'

/**
 * Capacitor app primitives return type.
 */
export interface CapacitorAppPrimitives {
  state: Accessor<CapacitorAppState>
  ready: Accessor<boolean>
  initialize: () => Promise<void>
}

/**
 * Create Capacitor app primitives for native app initialization.
 *
 * Wraps the core `createCapacitorApp` coordinator with Solid signals,
 * automatically initializing and cleaning up on disposal.
 *
 * @param options - Capacitor app configuration options.
 * @returns Capacitor app primitives object
 *
 * @example
 * ```tsx
 * import { createCapacitorApp } from '`@molecule/app-solid`'
 *
 * function App() {
 *   const { state, ready } = createCapacitorApp({
 *     pushNotifications: true,
 *     deepLinks: true,
 *     onDeepLink: (url) => console.log('Deep link:', url),
 *     onReady: () => console.log('App ready!'),
 *   })
 *
 *   return (
 *     <Show when={ready()} fallback={<p>Loading...</p>}>
 *       <Main />
 *     </Show>
 *   )
 * }
 * ```
 */
export function createCapacitorApp(options?: CapacitorAppOptions): CapacitorAppPrimitives {
  const app = createCapacitorAppCore(options)

  const [state, setState] = createSignal<CapacitorAppState>(app.getState())

  const unsubscribe = app.subscribe((newState) => {
    setState(newState)
  })

  // Auto-initialize
  app.initialize().catch(() => {
    // Error is captured in state.error via the core coordinator
  })

  onCleanup(() => {
    unsubscribe()
    app.destroy()
  })

  return {
    state,
    ready: () => state().ready,
    initialize: () => app.initialize(),
  }
}
