/**
 * Default provider for `@molecule/app-color-picker`.
 *
 * Provides an in-memory color picker implementation conforming to
 * the molecule color picker provider interface.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-color-picker'
 * import { createProvider } from '@molecule/app-color-picker-default'
 *
 * // Startup: bond once. `format` is the default for pickers that do not pass their own.
 * setProvider(createProvider({ format: 'hex' }))
 *
 * // In a settings screen: create a picker through the core provider.
 * let brandColor = '#3b82f6'
 * const picker = requireProvider().createPicker({
 *   value: brandColor,
 *   presets: ['#3b82f6', '#10b981', '#f59e0b'], // for YOUR swatch UI — the instance ignores them
 *   onChange: (color) => {
 *     brandColor = color // persist / re-render here
 *   },
 * })
 *
 * picker.setValue('#10b981') // e.g. a swatch click — fires onChange('#10b981')
 * console.log(picker.getValue(), picker.getFormat()) // '#10b981' 'hex'
 * picker.destroy() // on unmount
 * ```
 *
 * @remarks
 * HEADLESS: nothing is rendered — draw the swatches/input yourself from `getValue()` and
 * call `setValue()` on user input. Get pickers from `requireProvider().createPicker(...)`
 * after `setProvider(...)`; the core has no top-level `createPicker()`.
 *
 * This default instance is a plain value/format store: `setFormat()` only
 * records the format — it does NOT convert the current value between
 * hex/rgb/hsl, and `setValue()` accepts any string without validation or
 * normalization. If your UI offers format switching, convert the value
 * yourself before calling `setValue()`. `presets`, `showAlpha`, and
 * `showInput` are carried in options for YOUR rendering layer — the
 * instance does not act on them. `createProvider({ format })` sets the
 * DEFAULT format for every picker created by that provider; a per-picker
 * `createPicker({ format })` still overrides it, falling back to `'hex'`
 * when neither is set.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
