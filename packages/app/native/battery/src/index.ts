/**
 * Battery status interface for molecule.dev.
 *
 * Provides a unified API for battery monitoring across platforms: level,
 * charging state, low-battery callbacks, and capability discovery, plus
 * formatting helpers (`toPercentage`, `getLevelText`, `formatRemainingTime`)
 * and a `createBatteryAwareExecutor` for deferring heavy work on low charge.
 *
 * @example
 * ```ts
 * import type { BatteryProvider } from '@molecule/app-battery'
 * import { setProvider, getStatus, onLow, toPercentage } from '@molecule/app-battery'
 *
 * // No prebuilt provider bond ships yet — supply your platform implementation
 * // (web: navigator.getBattery, Chromium-only; native: the platform battery API).
 * const myBatteryProvider = {} as BatteryProvider // stand-in for your implementation
 * setProvider(myBatteryProvider)
 *
 * const status = await getStatus()
 * console.log(`Battery at ${toPercentage(status.level)}%`)
 *
 * const stop = onLow((level) => {
 *   console.warn(`Low battery: ${toPercentage(level)}%`)
 * }, 0.15)
 * stop()
 * ```
 *
 * @remarks
 * - **Wire with `setProvider()`, NOT `bond()`** — this core keeps a module-local provider
 *   reference; `bond('battery', provider)` is silently ignored and every call still throws
 *   "No provider set".
 * - **No prebuilt provider bond exists for this interface yet** — implement `BatteryProvider`
 *   yourself. Ignore any runtime error text suggesting a `-capacitor` package; none ships.
 * - Web support is narrow: `navigator.getBattery()` exists only in Chromium browsers. Gate the
 *   feature on `getCapabilities()`/`hasProvider()` and design for absence.
 * - `level` is 0-1, not 0-100 — use `toPercentage()`/`getLevelText()` for display.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
