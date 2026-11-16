/**
 * Solid controlled HSV + RGB + HEX color picker — design canvases, photo
 * editors, animation tools, brand editors.
 *
 * The Solid counterpart of `@molecule/app-color-picker-react`: same exports,
 * same props (React names), same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { ColorPicker } from '@molecule/app-color-picker-solid'
 *
 * export function StrokeColorField() {
 *   const [color, setColor] = createSignal('#3366ff')
 *   return <ColorPicker value={color()} onChange={setColor} />
 * }
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

export * from './ColorPicker.jsx'
export * from './conversions.js'
export * from './types.js'
