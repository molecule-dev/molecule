/**
 * Default provider for `@molecule/app-color-picker`.
 *
 * Provides an in-memory color picker implementation conforming to
 * the molecule color picker provider interface.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-color-picker-default'
 * import { setProvider } from '@molecule/app-color-picker'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * This default instance is a plain value/format store: `setFormat()` only
 * records the format — it does NOT convert the current value between
 * hex/rgb/hsl, and `setValue()` accepts any string without validation or
 * normalization. If your UI offers format switching, convert the value
 * yourself before calling `setValue()`. `presets`, `showAlpha`, and
 * `showInput` are carried in options for YOUR rendering layer — the
 * instance does not act on them. The `createProvider({ format })` config
 * knob is currently ignored; set `format` per-picker in
 * `createPicker(options)` instead.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
