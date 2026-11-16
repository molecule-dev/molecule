/**
 * Vue controlled HSV + RGB + HEX color picker — design canvases, photo
 * editors, animation tools, brand editors.
 *
 * The Vue counterpart of `@molecule/app-color-picker-react`: same exports,
 * same props (React names), same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { ColorPicker } from '@molecule/app-color-picker-vue'
 *
 * const StrokeColorField = defineComponent({
 *   setup() {
 *     const color = ref('#3366ff')
 *     return () => h(ColorPicker, { value: color.value, onChange: (v) => (color.value = v) })
 *   },
 * })
 *
 * createApp(StrokeColorField).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`) and the binding's i18n plugin
 *   for the translated `aria-label`s — rendering throws without a ClassMap.
 * - Controlled: the parent owns `value` and receives every change through
 *   `onChange`. Pure UI — render it inside whatever popover you prefer.
 *
 * @module
 */

export * from './ColorPicker.js'
export * from './conversions.js'
export * from './types.js'
