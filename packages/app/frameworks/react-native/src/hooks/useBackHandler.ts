/**
 * React Native hook for Android hardware back button.
 *
 * @module
 */

import { useEffect } from 'react'

import type { UseBackHandlerOptions } from '../types.js'

/**
 * Registers a handler for the Android hardware back button.
 *
 * Return `true` from the handler to prevent the default back behavior,
 * or `false` to allow it.
 *
 * @param handler - Callback invoked when the hardware back button is pressed.
 * @param options - Optional configuration.
 *
 * @example
 * ```tsx
 * useBackHandler(() => {
 *   if (isModalOpen) {
 *     closeModal()
 *     return true // Prevent default back
 *   }
 *   return false // Allow default back
 * })
 * ```
 */
export function useBackHandler(handler: () => boolean, options: UseBackHandlerOptions = {}): void {
  const { enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    // Dynamic import to avoid crashes on non-RN platforms
    let cleanup: (() => void) | undefined

    try {
      // BackHandler is available from react-native
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BackHandler } = require('react-native') as {
        BackHandler: {
          addEventListener: (event: string, handler: () => boolean) => { remove: () => void }
        }
      }
      const subscription = BackHandler.addEventListener('hardwareBackPress', handler)
      cleanup = () => subscription.remove()
    } catch {
      // Not running in React Native — no-op
    }

    return cleanup
  }, [handler, enabled])
}
