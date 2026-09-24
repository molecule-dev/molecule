/**
 * Adjustment slider feature for molecule.dev.
 *
 * Bipolar (zero-center) numeric slider tuned for photo-editor / DAW /
 * animation parameter controls (brightness, contrast, saturation, exposure,
 * gain, pan, etc.). Pairs well with `@molecule/app-feature-image-canvas-react`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { AdjustmentSlider } from '@molecule/app-adjustment-slider-react'
 * import { useTranslation } from '@molecule/app-react'
 *
 * export function ExposureControl() {
 *   const { t } = useTranslation()
 *   const [exposure, setExposure] = useState(0)
 *   return (
 *     <AdjustmentSlider
 *       label={t('exifPanel.exposure', undefined, { defaultValue: 'Exposure' })}
 *       value={exposure}
 *       onChange={setExposure}
 *       min={-100}
 *       max={100}
 *       step={1}
 *       bipolar
 *       unit="%"
 *       dataMolId="photo-editor-exposure"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Must render inside `<I18nProvider>` / `<MoleculeProvider>`** from `@molecule/app-react` — it
 *   calls `useTranslation()`, which throws "useI18nProvider must be used within an I18nProvider"
 *   otherwise. It also needs a ClassMap bond: `setClassMap(classMap)` from `@molecule/app-ui` at
 *   startup, or `getClassMap()` throws.
 * - **Controlled only**: it never holds the value — without `value` + `onChange` wired to state the
 *   thumb snaps back. `onChange` receives an already clamped and step-snapped number, and is NOT
 *   called when the value would not change.
 * - Reset (double-click the input, or click the value button `adjustment-slider-reset`) calls
 *   `onReset` if given, else emits `0` when `bipolar` (the default) or `min` when `bipolar={false}`.
 * - `unit` is appended with no space (`"12%"`); pass `format` for anything else (`"+1.4 EV"`).
 *   `dataMolId` lands on the outer container; the input is always `adjustment-slider-input`.
 *
 * @module
 */

export * from './AdjustmentSlider.js'
export * from './types.js'
export * from './utilities.js'
