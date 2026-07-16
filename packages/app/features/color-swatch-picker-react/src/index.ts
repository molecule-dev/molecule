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
 * @remarks
 * All text (`label` per swatch, `ariaLabel` for the group) is
 * consumer-provided — pass translated strings via `t()`; the component has no
 * built-in copy. Selection is fully controlled: persist `onChange(value)` and
 * re-render with the new `value`. Swatches render as `role="radio"` buttons
 * sized by the `size` prop (default 28px) with the CSS `color` you provide.
 *
 * @module
 */

export * from './ColorSwatchPicker.js'
