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
 * import { createCapacitorApp } from '@molecule/app-solid'
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
  app.initialize().catch((_error) => {
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

/**
 * What {@link useCapacitorApp} returns: the coordinator's state fields as
 * accessors plus `initialize` (the same names React returns).
 */
export type UseCapacitorAppResult = {
  readonly [K in keyof CapacitorAppState]: Accessor<CapacitorAppState[K]>
} & {
  initialize: () => Promise<void>
}

/**
 * Capacitor app initialization and state management, under React's hook name.
 *
 * Creates a `CapacitorApp` coordinator on mount, subscribes to state changes,
 * and auto-initializes. Cleans up listeners on unmount via `destroy()`.
 *
 * @param options - Capacitor app configuration options.
 * @returns The state fields as accessors and an `initialize` function for
 *   manual re-initialization.
 * @example
 * ```tsx
 * const { ready, error } = useCapacitorApp({ pushNotifications: true })
 * <Show when={ready()} fallback={<SplashScreen />}>{children}</Show>
 * ```
 */
export function useCapacitorApp(options: CapacitorAppOptions = {}): UseCapacitorAppResult {
  const app = createCapacitorAppCore(options)

  const [state, setState] = createSignal<CapacitorAppState>(app.getState())

  const unsubscribe = app.subscribe((newState) => {
    setState(newState)
  })

  // Auto-initialize on mount (React runs it in its mount effect; the
  // coordinator puts a failure in state.error either way).
  app.initialize().catch((_error: unknown) => {
    // The coordinator puts the error in state, which this hook returns.
  })

  onCleanup(() => {
    unsubscribe()
    app.destroy()
  })

  const fields = Object.fromEntries(
    (Object.keys(state()) as (keyof CapacitorAppState)[]).map((key) => [key, () => state()[key]]),
  ) as { [K in keyof CapacitorAppState]: Accessor<CapacitorAppState[K]> }

  return { ...fields, initialize: () => app.initialize() }
}
