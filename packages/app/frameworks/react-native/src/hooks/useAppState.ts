/**
 * React Native hook for app foreground/background state.
 *
 * @module
 */

import { useEffect, useState } from 'react'

import type { UseAppStateResult } from '../types.js'

type AppStateStatus = 'active' | 'background' | 'inactive'

/**
 * Tracks whether the app is in the foreground, background, or inactive.
 *
 * Uses React Native's `AppState` API under the hood. Falls back to
 * 'active' on platforms where AppState is unavailable.
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
  const [appState, setAppState] = useState<AppStateStatus>('active')

  useEffect(() => {
    let cleanup: (() => void) | undefined

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppState } = require('react-native') as {
        AppState: {
          currentState: string
          addEventListener: (
            event: string,
            handler: (state: string) => void,
          ) => { remove: () => void }
        }
      }

      setAppState((AppState.currentState as AppStateStatus) || 'active')

      const subscription = AppState.addEventListener('change', (nextState: string) => {
        setAppState((nextState as AppStateStatus) || 'active')
      })
      cleanup = () => subscription.remove()
    } catch {
      // Not running in React Native — stay 'active'
    }

    return cleanup
  }, [])

  return {
    appState,
    isActive: appState === 'active',
  }
}
