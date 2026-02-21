/**
 * React Native hook for safe area insets.
 *
 * @module
 */

/**
 * Safe area inset values in points.
 */
export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Returns the current safe area insets from `react-native-safe-area-context`.
 *
 * Must be used within a `SafeAreaProvider`. Falls back to zero insets
 * if the context is unavailable.
 *
 * @returns Safe area insets for the current device.
 *
 * @example
 * ```tsx
 * const insets = useSafeArea()
 *
 * return (
 *   <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
 *     <App />
 *   </View>
 * )
 * ```
 */
export function useSafeArea(): SafeAreaInsets {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useSafeAreaInsets } = require('react-native-safe-area-context') as {
      useSafeAreaInsets: () => SafeAreaInsets
    }
    return useSafeAreaInsets()
  } catch {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }
}
