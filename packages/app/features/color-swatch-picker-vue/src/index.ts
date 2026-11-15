/**
 * Vue color-swatch picker.
 *
 * Exports `<ColorSwatchPicker>` — grid of colored circles with single-select
 * state. It is the Vue counterpart of `@molecule/app-color-swatch-picker-react`:
 * same props (React names) and the same DOM for the same input. Apps switching
 * framework change only the package name in their imports.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { ColorSwatchPicker } from '@molecule/app-color-swatch-picker-vue'
 *
 * const swatches = [
 *   { value: 'red', color: '#ef4444', label: 'Red' },
 *   { value: 'blue', color: '#3b82f6', label: 'Blue' },
 *   { value: 'green', color: '#22c55e', label: 'Green' },
 * ]
 *
 * export default defineComponent({
 *   setup() {
 *     const selected = ref('red')
 *     return () =>
 *       h(ColorSwatchPicker, {
 *         swatches,
 *         value: selected.value,
 *         onChange: (value: string) => (selected.value = value),
 *         ariaLabel: 'Tag color',
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * All text (`label` per swatch, `ariaLabel` for the group) is
 * consumer-provided — pass translated strings via `t()`; the component has no
 * built-in copy. Selection is fully controlled: persist `onChange(value)` and
 * re-render with the new `value`. Swatches render as `role="radio"` buttons
 * sized by the `size` prop (default 28px) with the CSS `color` you provide.
 * The node-valued `preview` prop arrives as a prop AND a same-named slot;
 * both work.
 *
 * @module
 */

export * from './ColorSwatchPicker.js'
export * from './types.js'
