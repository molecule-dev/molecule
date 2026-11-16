/**
 * Svelte controlled HSV + RGB + HEX color picker — design canvases, photo
 * editors, animation tools, brand editors.
 *
 * The Svelte counterpart of `@molecule/app-color-picker-react`: same exports,
 * same props (React names), same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ColorPicker } from '@molecule/app-color-picker-svelte'
 *
 *   let color = $state('#3366ff')
 * </script>
 *
 * <ColorPicker value={color} onChange={(next) => (color = next)} />
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`) and the binding's i18n
 *   provider for the translated `aria-label`s — rendering throws without a
 *   ClassMap.
 * - Controlled: the parent owns `value` and receives every change through
 *   `onChange`. Pure UI — render it inside whatever popover you prefer.
 *
 * @module
 */

export * from './components.js'
export * from './conversions.js'
export * from './types.js'
