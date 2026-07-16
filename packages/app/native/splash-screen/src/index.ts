/**
 * Splash screen control interface for molecule.dev.
 *
 * Framework-agnostic core for the native launch/splash screen through a
 * swappable `SplashScreenProvider`: `show`/`hide` with optional fade,
 * state queries (`getState`, `isVisible`), `configure`, and readiness
 * helpers (`hideWhenReady`, `showForMinDuration`,
 * `createSplashController`).
 *
 * @example
 * ```typescript
 * import { hasProvider, hide } from '@molecule/app-splash-screen'
 *
 * async function bootApp(loadInitialData: () => Promise<void>): Promise<void> {
 *   await loadInitialData()
 *   // Hide ONLY after the first real frame is renderable — and ALWAYS hide,
 *   // even on error, or the app hangs on the splash forever.
 *   if (hasProvider()) {
 *     await hide({ fadeOutDuration: 200 }).catch(() => hide())
 *   }
 * }
 * ```
 *
 * @remarks
 * - **Every accessor THROWS until `setProvider()` is called.** The one
 *   prebuilt bond is `@molecule/app-splash-screen-react-native`; **web has
 *   no bond and no OS splash** (an HTML/CSS boot screen is app code, not
 *   this package) — on web, skip wiring and gate on `hasProvider()`.
 * - **The #1 failure mode is never calling `hide()`**: with the
 *   react-native bond, creating the provider arms prevent-auto-hide, so an
 *   app that forgets `hide()` (or throws before it) sits on the splash
 *   forever. Put `hide()` in a `finally`.
 * - Runtime `show()`/`hide()` OPTIONS (fade, duration, spinner) are
 *   best-effort: the react-native bond ignores them (`getCapabilities()`
 *   reports `spinnerSupported/configurable: false`; splash artwork is
 *   build-time config there). Check capabilities instead of assuming.
 * - `show()` mid-session cannot be relied on to re-display a hidden native
 *   splash — treat the splash as a launch-only surface and use an in-app
 *   loader for later blocking work.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
