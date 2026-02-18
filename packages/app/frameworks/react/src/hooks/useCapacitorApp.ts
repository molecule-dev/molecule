/**
 * React hook for Capacitor app initialization.
 *
 * @module
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  type CapacitorApp,
  type CapacitorAppOptions,
  type CapacitorAppState,
  createCapacitorApp,
} from '@molecule/app-platform'

/**
 * Hook return type.
 */
export type UseCapacitorAppResult = CapacitorAppState & {
  initialize: () => Promise<void>
}

/**
 * Hook for Capacitor app initialization and state management.
 *
 * Creates a `CapacitorApp` coordinator on mount, subscribes to state changes,
 * and auto-initializes. Cleans up listeners on unmount via `destroy()`.
 *
 * @param options - Capacitor app configuration options
 * @returns Current app state and an `initialize` function for manual re-initialization
 *
 * @example
 * ```tsx
 * const { ready, deviceReady, pushReady, error } = useCapacitorApp({
 *   pushNotifications: true,
 *   deepLinks: true,
 *   onDeepLink: (url) => navigate(url),
 * })
 *
 * if (!ready) return <SplashScreen />
 * if (error) return <ErrorScreen error={error} />
 * ```
 */
export function useCapacitorApp(options: CapacitorAppOptions = {}): UseCapacitorAppResult {
  const appRef = useRef<CapacitorApp | null>(null)

  // Lazy-init the app instance so it's only created once
  if (!appRef.current) {
    appRef.current = createCapacitorApp(options)
  }

  const [state, setState] = useState<CapacitorAppState>(() => appRef.current!.getState())

  const initialize = useCallback(async () => {
    if (appRef.current) {
      await appRef.current.initialize()
    }
  }, [])

  useEffect(() => {
    const app = appRef.current!

    // Subscribe to state changes
    const unsubscribe = app.subscribe((newState) => {
      setState(newState)
    })

    // Auto-initialize on mount
    app.initialize().catch(() => {
      // Error is captured in state via the coordinator
    })

    return () => {
      unsubscribe()
      app.destroy()
    }
  }, [])

  return {
    ...state,
    initialize,
  }
}
