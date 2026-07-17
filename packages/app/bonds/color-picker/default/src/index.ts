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
 * instance does not act on them. `createProvider({ format })` sets the
 * DEFAULT format for every picker created by that provider; a per-picker
 * `createPicker({ format })` still overrides it, falling back to `'hex'`
 * when neither is set.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
