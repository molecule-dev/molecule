/**
 * Controlled HSV + RGB + HEX color picker — design canvases, photo editors,
 * animation tools, brand editors.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ColorPicker } from '@molecule/app-color-picker-react'
 *
 * export function StrokeColorField() {
 *   const [color, setColor] = useState('#3366ff')
 *   return (
 *     <div>
 *       <ColorPicker value={color} onChange={setColor} dataMolId="stroke-color" />
 *       <svg width="120" height="24" aria-hidden="true">
 *         <line x1="0" y1="12" x2="120" y2="12" stroke={color} strokeWidth="4" />
 *       </svg>
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - It is CONTROLLED: `value` and `onChange` are both required, and nothing changes on screen
 *   until you store the emitted value and pass it back. `onChange` always receives a lowercase
 *   `#rrggbb` string — never an RGB/HSV object.
 * - `value` must be `#rgb` / `#rrggbb` (the `#` is optional). Anything else — `rgb(...)`, named
 *   colors, `#rrggbbaa` — silently renders as black. There is no alpha channel and no eyedropper.
 * - The HEX text field commits only on Enter or blur (invalid input reverts); the sliders and
 *   R/G/B number inputs emit on every change.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise); `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup. Labels use the
 *   `colorPicker.*` keys (companion bond: `@molecule/app-locales-color-picker`).
 * - `hexToRgb` / `rgbToHex` / `rgbToHsv` / `hsvToRgb` / `isValidHex` are exported for your own
 *   conversions.
 * - The Red/Green/Blue labels use `colorPicker.r` / `colorPicker.g` / `colorPicker.b`, which the
 *   companion bond does not ship yet — they fall back to English unless your app adds them.
 *
 * @module
 */

export * from './ColorPicker.js'
export * from './conversions.js'
export * from './types.js'
