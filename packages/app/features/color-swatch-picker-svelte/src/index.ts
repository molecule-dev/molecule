/**
 * Svelte color-swatch picker — the Svelte counterpart of
 * `@molecule/app-color-swatch-picker-react`, with the same props (React
 * names) and the same DOM for the same input.
 *
 * Exports `ColorSwatchPicker` — grid of colored circles with single-select
 * state. Apps switching framework change only the package name in their
 * imports.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ColorSwatchPicker } from '@molecule/app-color-swatch-picker-svelte'
 *
 *   let selected = $state('red')
 *
 *   const swatches = [
 *     { value: 'red', color: '#ef4444', label: 'Red' },
 *     { value: 'blue', color: '#3b82f6', label: 'Blue' },
 *     { value: 'green', color: '#22c55e', label: 'Green' },
 *   ]
 * </script>
 *
 * <ColorSwatchPicker
 *   {swatches}
 *   value={selected}
 *   onChange={(value) => (selected = value)}
 *   ariaLabel="Tag color"
 * >
 *   {#snippet preview()}
 *     <div>Live preview</div>
 *   {/snippet}
 * </ColorSwatchPicker>
 * ```
 *
 * @remarks
 * All text (`label` per swatch, `ariaLabel` for the group) is
 * consumer-provided — pass translated strings via `t()`; the component has no
 * built-in copy. Selection is fully controlled: persist `onChange(value)` and
 * re-render with the new `value`. Swatches render as `role="radio"` buttons
 * sized by the `size` prop (default 28px) with the CSS `color` you provide.
 * The node-valued `preview` prop is a snippet.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
