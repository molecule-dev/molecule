/**
 * Svelte adjustment slider feature for molecule.dev.
 *
 * Bipolar (zero-center) numeric slider tuned for photo-editor / DAW /
 * animation parameter controls (brightness, contrast, saturation, exposure,
 * gain, pan, etc.). It is the Svelte counterpart of
 * `@molecule/app-adjustment-slider-react`: same exports, same props (React
 * names), same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AdjustmentSlider } from '@molecule/app-adjustment-slider-svelte'
 *
 *   let exposure = $state(0)
 * </script>
 *
 * <AdjustmentSlider
 *   label="Exposure"
 *   value={exposure}
 *   onChange={(next) => (exposure = next)}
 *   min={-100}
 *   max={100}
 *   step={1}
 *   bipolar
 *   unit="%"
 * />
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`) and the binding's i18n
 *   provider for the translated `aria-label`s — rendering throws without a
 *   ClassMap.
 * - The numeric display doubles as the reset button; double-clicking the range
 *   input resets it too.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
export * from './utilities.js'
