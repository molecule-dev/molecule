/**
 * Screen brightness control interface for molecule.dev.
 *
 * Provides a unified API for screen brightness across platforms: get/set
 * level (0-1), auto-brightness, keep-screen-on, reset, and capability
 * discovery, plus conveniences (`setMax`, `setMin`, `increase`, `decrease`).
 *
 * @example
 * ```ts
 * import type { BrightnessProvider } from '@molecule/app-brightness'
 * import { setProvider, setBrightness, setKeepScreenOn, getCapabilities } from '@molecule/app-brightness'
 *
 * // No prebuilt provider bond ships yet — supply your platform implementation.
 * // This is a NATIVE capability: browsers cannot change physical screen brightness.
 * const myBrightnessProvider = {} as BrightnessProvider // stand-in for your implementation
 * setProvider(myBrightnessProvider)
 *
 * const caps = await getCapabilities()
 * if (caps.supported) {
 *   await setBrightness(1) // full brightness, e.g. while showing a QR code
 * }
 * await setKeepScreenOn(true) // prevent sleep during the flow
 * ```
 *
 * @remarks
 * - **Wire with `setProvider()`, NOT `bond()`** — this core keeps a module-local provider
 *   reference; `bond('brightness', provider)` is silently ignored.
 * - **No prebuilt provider bond exists for this interface yet.** Ignore any runtime error text
 *   suggesting a `-capacitor` package; none ships.
 * - **Browsers cannot set physical screen brightness.** On web the only implementable slice is
 *   `setKeepScreenOn` (Screen Wake Lock API, secure context); a web `setBrightness` can at best
 *   fake it with a dimming overlay. Gate on `getCapabilities()` and treat this as a
 *   native-app feature.
 * - Levels are 0-1. Restore the user's brightness (`reset()`) when your flow ends — leaving a
 *   forced max/min level is hostile.
 *
 * @module
 */

export * from './brightness.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
