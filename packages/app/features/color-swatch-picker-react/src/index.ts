/**
 * React color-swatch picker.
 *
 * Exports `<ColorSwatchPicker>` — grid of colored circles with single-select state.
 *
 * @example
 * ```tsx
 * import { ColorSwatchPicker } from '@molecule/app-color-swatch-picker-react'
 *
 * const swatches = [
 *   { value: 'red', color: '#ef4444', label: 'Red' },
 *   { value: 'blue', color: '#3b82f6', label: 'Blue' },
 *   { value: 'green', color: '#22c55e', label: 'Green' },
 * ]
 *
 * <ColorSwatchPicker
 *   swatches={swatches}
 *   value={selected}
 *   onChange={(value) => setSelected(value)}
 *   ariaLabel="Tag color"
 * />
 * ```
 *
 * @module
 */

export * from './ColorSwatchPicker.js'
