/**
 * Controlled HSV + RGB + HEX color picker — design canvases, photo editors,
 * animation tools, brand editors.
 *
 * @example
 * ```tsx
 * import { ColorPicker } from '@molecule/app-color-picker-react'
 *
 * function StrokeColorField() {
 *   const [color, setColor] = useState('#3366ff')
 *   return <ColorPicker value={color} onChange={setColor} />
 * }
 * ```
 *
 * @module
 */

export * from './ColorPicker.js'
export * from './conversions.js'
export * from './types.js'
