/**
 * React Native splash screen provider for molecule.dev.
 *
 * Implements the `SplashScreenProvider` interface from `@molecule/app-splash-screen`
 * using `expo-splash-screen`: keeps the native splash visible during startup and
 * hides it when the app is ready.
 *
 * @example
 * ```typescript
 * import { setProvider, hide } from '@molecule/app-splash-screen'
 * import { provider } from '@molecule/app-splash-screen-react-native'
 *
 * setProvider(provider)
 *
 * // Later — once the root view has rendered / initial data + fonts are ready:
 * await hide()
 * ```
 *
 * @remarks
 * - **Creating the default `provider` immediately arms prevent-auto-hide** (config
 *   `preventAutoHide` defaults to `true`): the native splash stays up until the app
 *   explicitly calls `hide()`. If the app appears to hang on the splash forever, the
 *   missing `hide()` call is why. Use `createReactNativeSplashScreenProvider({
 *   preventAutoHide: false })` to keep the OS auto-hide behavior.
 * - `expo-splash-screen` is loaded on demand — install with
 *   `npx expo install expo-splash-screen`.
 * - `show()`/`hide()` OPTIONS (fade, duration, spinner) are ignored on this platform —
 *   `getCapabilities()` reports `spinnerSupported: false, configurable: false`. Style
 *   the splash via the Expo config plugin (`app.json` → `expo-splash-screen`), not at
 *   runtime.
 * - `show()` cannot bring back an already-hidden splash; it only re-arms
 *   prevent-auto-hide for the current launch.
 *
 * @module @molecule/app-splash-screen-react-native
 */

export * from './provider.js'
export * from './types.js'
