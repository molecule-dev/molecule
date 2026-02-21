/**
 * React Native hook for keyboard visibility and height.
 *
 * @module
 */

import { useEffect, useState } from 'react'

import type { UseKeyboardHeightResult } from '../types.js'

/**
 * Tracks soft keyboard visibility and height.
 *
 * Uses React Native's `Keyboard` API. Falls back to hidden state
 * on platforms where Keyboard is unavailable.
 *
 * @returns Current keyboard height and visibility state.
 *
 * @example
 * ```tsx
 * const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight()
 *
 * return (
 *   <View style={{ paddingBottom: keyboardHeight }}>
 *     <TextInput />
 *   </View>
 * )
 * ```
 */
export function useKeyboardHeight(): UseKeyboardHeightResult {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const cleanups: Array<() => void> = []

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Keyboard, Platform } = require('react-native') as {
        Keyboard: {
          addListener: (
            event: string,
            handler: (e: { endCoordinates: { height: number } }) => void,
          ) => { remove: () => void }
        }
        Platform: { OS: string }
      }

      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

      const showSub = Keyboard.addListener(showEvent, (e) => {
        setKeyboardHeight(e.endCoordinates.height)
      })
      cleanups.push(() => showSub.remove())

      const hideSub = Keyboard.addListener(hideEvent, () => {
        setKeyboardHeight(0)
      })
      cleanups.push(() => hideSub.remove())
    } catch {
      // Not running in React Native — no-op
    }

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return {
    keyboardHeight,
    isKeyboardVisible: keyboardHeight > 0,
  }
}
