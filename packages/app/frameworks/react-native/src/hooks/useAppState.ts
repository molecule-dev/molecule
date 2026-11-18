/**
 * React Native hook for app foreground/background state.
 *
 * @module
 */

import { useSyncExternalStore } from 'react'

import type { UseAppStateResult } from '../types.js'

type AppStateStatus = 'active' | 'background' | 'inactive'

interface AppStateModule {
  currentState: string | null
  addEventListener: (event: string, handler: (state: string) => void) => { remove: () => void }
}

/**
 * Loads React Native's `AppState` module, or `undefined` where React Native is
 * not available (tests, server rendering, a non-RN app).
 *
 * @returns The AppState module, or undefined.
 */
function loadAppState(): AppStateModule | undefined {
  try {
    // react-native is an optional peer: a static import would fail to load on
    // Node, in server rendering and in tests, where this hook reports 'active'.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppState } = require('react-native') as { AppState?: AppStateModule }
    return AppState
  } catch (_error) {
    // React Native is not installed here: the hook reports 'active'.
    return undefined
  }
}

/**
 * Subscribes to AppState changes; without React Native there is nothing to
 * subscribe to.
 *
 * @param onChange - Called after the app state changes.
 * @returns The unsubscribe function.
 */
function subscribe(onChange: () => void): () => void {
  const AppState = loadAppState()
  if (!AppState) return () => {}
  const subscription = AppState.addEventListener('change', onChange)
  return () => subscription.remove()
}

/**
 * The current app state: `'active'` while Android reports none yet, and where
 * React Native is not available.
 *
 * @returns The app state.
 */
function getSnapshot(): AppStateStatus {
  return (loadAppState()?.currentState as AppStateStatus | null | undefined) || 'active'
}

/**
 * The server-rendering app state: no app is in the background there.
 *
 * @returns Always `'active'`.
 */
function getServerSnapshot(): AppStateStatus {
  return 'active'
}

/**
 * Tracks whether the app is in the foreground, background, or inactive.
 *
 * Reads React Native's `AppState` as an external store, so the first render
 * already reports the real state and a change between that render and the
 * subscription is not missed. Falls back to 'active' on platforms where
 * AppState is unavailable.
 *
 * @returns Current app state and whether the app is active.
 *
 * @example
 * ```tsx
 * const { appState, isActive } = useAppState()
 *
 * useEffect(() => {
 *   if (isActive) {
 *     refreshData()
 *   }
 * }, [isActive])
 * ```
 */
export function useAppState(): UseAppStateResult {
  const appState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return {
    appState,
    isActive: appState === 'active',
  }
}
