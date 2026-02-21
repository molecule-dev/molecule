/**
 * React Native specific types for molecule.dev.
 *
 * @module
 */

/**
 * Options for the useBackHandler hook.
 */
export interface UseBackHandlerOptions {
  /** Whether the handler is enabled. Defaults to true. */
  enabled?: boolean
}

/**
 * Result from the useAppState hook.
 */
export interface UseAppStateResult {
  /** Current app state: 'active' | 'background' | 'inactive' */
  appState: string
  /** Whether the app is in the foreground */
  isActive: boolean
}

/**
 * Result from the useKeyboardHeight hook.
 */
export interface UseKeyboardHeightResult {
  /** Current keyboard height in points (0 when hidden) */
  keyboardHeight: number
  /** Whether the keyboard is currently visible */
  isKeyboardVisible: boolean
}
