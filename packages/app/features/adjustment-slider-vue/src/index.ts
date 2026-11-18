/**
 * Vue adjustment slider feature for molecule.dev.
 *
 * Bipolar (zero-center) numeric slider tuned for photo-editor / DAW /
 * animation parameter controls (brightness, contrast, saturation, exposure,
 * gain, pan, etc.). It is the Vue counterpart of
 * `@molecule/app-adjustment-slider-react`: same exports, same props (React
 * names), same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { AdjustmentSlider } from '@molecule/app-adjustment-slider-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const exposure = ref(0)
 *     return () =>
 *       h(AdjustmentSlider, {
 *         label: 'Exposure',
 *         value: exposure.value,
 *         onChange: (next: number) => (exposure.value = next),
 *         min: -100,
 *         max: 100,
 *         step: 1,
 *         bipolar: true,
 *         unit: '%',
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`) and the binding's i18n plugin
 *   for the translated `aria-label`s — rendering throws without a ClassMap.
 * - The numeric display doubles as the reset button; double-clicking the range
 *   input resets it too.
 * - React's `onChange` / `onReset` props are Vue props of the same names, not
 *   events, so a consumer switches framework by changing only the import.
 *
 * @module
 */

export * from './AdjustmentSlider.js'
export * from './types.js'
export * from './utilities.js'
