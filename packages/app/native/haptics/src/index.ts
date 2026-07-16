/**
 * Haptic feedback interface for molecule.dev.
 *
 * Framework-agnostic core for tactile feedback through a swappable
 * `HapticsProvider`: semantic feedback (`impact`, `notification`,
 * `selection`), raw `vibrate`, custom `playPattern` sequences, and
 * ready-made `patterns` presets.
 *
 * @example
 * ```typescript
 * import {
 *   impact,
 *   isSupported,
 *   notification,
 *   selection,
 * } from '@molecule/app-haptics'
 *
 * async function onAddToCart(): Promise<void> {
 *   if (!(await isSupported())) return // safe: false when nothing is wired
 *   await impact('medium')
 * }
 *
 * async function onSaveSuccess(): Promise<void> {
 *   if (await isSupported()) await notification('success')
 * }
 *
 * async function onPickerTick(): Promise<void> {
 *   if (await isSupported()) await selection()
 * }
 * ```
 *
 * @remarks
 * - **`isSupported()` is the only accessor that is safe to call unbonded**
 *   (returns `false`); everything else THROWS until `setProvider()` is
 *   called. **No prebuilt provider package ships with molecule** — supply a
 *   `HapticsProvider` from your native runtime, or skip wiring and let
 *   `isSupported()` gate the calls away on web/desktop.
 * - Haptics are an ENHANCEMENT, never a channel: nothing may depend on the
 *   user feeling it (iPhones with System Haptics off, most desktops, and
 *   many Android WebViews produce nothing).
 * - A web provider would sit on `navigator.vibrate` — Android-Chrome only
 *   (no iOS Safari), it needs a prior user interaction, and it cannot vary
 *   intensity, so `impact('light'|'heavy')` degrades to timing patterns.
 *   Check `getCapabilities()` rather than assuming style nuance exists.
 *
 * @module
 */

export * from './patterns.js'
export * from './provider.js'
export * from './types.js'
