/**
 * React Native keyboard provider for molecule.dev.
 *
 * Uses react-native's `Keyboard`/`Dimensions` to implement the
 * `KeyboardProvider` interface from `@molecule/app-keyboard`: dismiss,
 * visibility + height state, and show/hide events.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-keyboard'
 * import { provider } from '@molecule/app-keyboard-react-native'
 *
 * setProvider(provider)   // once, at app startup
 * ```
 *
 * @remarks
 * - **`show()` is a no-op and `toggle()` can only hide** — React Native cannot
 *   open the keyboard programmatically; focus a `TextInput` instead. `hide()`
 *   works (`Keyboard.dismiss()`).
 * - **`setResizeMode`/`setStyle`/`setAccessoryBar`/`setScroll` are no-ops** in
 *   this bond — resize is configured in AndroidManifest.xml / app.json, scroll
 *   via `KeyboardAvoidingView`. `getCapabilities()` reports all four `false`;
 *   feature-gate on it rather than assuming the calls did something.
 * - `ReactNativeKeyboardConfig.defaultScrollPadding` is currently INERT.
 * - Requires the `react-native` peer; it is imported lazily and a missing
 *   install surfaces as a descriptive error on first use.
 *
 * @module @molecule/app-keyboard-react-native
 */

export * from './provider.js'
export * from './types.js'
