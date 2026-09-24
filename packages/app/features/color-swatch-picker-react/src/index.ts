/**
 * React color-swatch picker.
 *
 * Exports `<ColorSwatchPicker>` — grid of colored circles with single-select state.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { type ColorSwatch, ColorSwatchPicker } from '@molecule/app-color-swatch-picker-react'
 * import { t } from '@molecule/app-i18n'
 *
 * const TAG_COLORS: ColorSwatch[] = [
 *   { value: 'red', color: '#ef4444', label: 'Red' },
 *   { value: 'blue', color: '#3b82f6', label: 'Blue' },
 *   { value: 'green', color: '#22c55e', label: 'Green' },
 * ]
 *
 * export function TagColorField() {
 *   const [selected, setSelected] = useState('blue')
 *   const current = TAG_COLORS.find((s) => s.value === selected)
 *   return (
 *     <ColorSwatchPicker
 *       swatches={TAG_COLORS}
 *       value={selected}
 *       onChange={setSelected}
 *       ariaLabel={t('colorPicker.group', undefined, { defaultValue: 'Color picker' })}
 *       preview={<span style={{ color: current?.color }}>{current?.label}</span>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Selection is fully CONTROLLED and `value` is REQUIRED: store what `onChange(value)` gives you
 *   and pass it back, or clicks change nothing. `onChange` receives the swatch's `value` (your
 *   id), NOT its `color`.
 * - All text (`label` per swatch, `ariaLabel` for the group) is consumer-provided — the
 *   component has no built-in copy and no locale bond; pass translated strings. A swatch
 *   without `label` uses its `value` as the aria-label.
 * - `getClassMap()` throws unless `setClassMap(classMap)` from `@molecule/app-ui` ran at
 *   startup. It does not use `useTranslation()`, so no `<I18nProvider>` is required.
 * - Swatches render as `role="radio"` buttons (`data-mol-id="color-swatch-<value>"`) sized by
 *   the `size` prop in PIXELS (default 28) with the CSS `color` you provide. There is no
 *   free-form color input — use `@molecule/app-color-picker-react` for that.
 *
 * @module
 */

export * from './ColorSwatchPicker.js'
