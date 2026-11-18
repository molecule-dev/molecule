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

/** The part of `react-native-safe-area-context` this hook reads. */
interface SafeAreaModule {
  useSafeAreaInsets: () => SafeAreaInsets
}

/** Zero insets — the documented fallback whenever real ones are unavailable. */
function zeroInsets(): SafeAreaInsets {
  return { top: 0, right: 0, bottom: 0, left: 0 }
}

/**
 * Loads `react-native-safe-area-context`.
 *
 * The peer is optional and the hook must answer before the first paint, so it
 * is loaded synchronously when this module loads: a static import would force
 * every host to install the package, and a dynamic `import()` cannot resolve
 * in time.
 *
 * @returns The module's `useSafeAreaInsets`, or `null` when it is unavailable.
 */
function resolveSafeAreaHook(): (() => SafeAreaInsets) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const peer = require('react-native-safe-area-context') as SafeAreaModule | undefined
    return peer?.useSafeAreaInsets ?? null
  } catch (_error) {
    // Safe to ignore: react-native-safe-area-context is an optional peer dep;
    // if it is absent, zero insets are the documented fallback.
    return null
  }
}

// The peer's hook when it is installed, zero insets otherwise. Resolved once, when this module
// loads, so every render calls the same hook and the hook order never changes.
const useResolvedInsets: () => SafeAreaInsets = resolveSafeAreaHook() ?? zeroInsets

/**
 * Returns the current safe area insets from `react-native-safe-area-context`.
 *
 * Must be used within a `SafeAreaProvider`. Falls back to zero insets
 * if the context is unavailable.
 *
 * The peer's hook is called unconditionally on every render once the module is
 * installed, so its call order is stable; when it is not installed the hook
 * consistently returns zeros for every input.
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
    return useResolvedInsets()
  } catch (_error) {
    // Safe to ignore: without a mounted SafeAreaProvider the insets are
    // unavailable and zero insets are the documented fallback.
    return zeroInsets()
  }
}
