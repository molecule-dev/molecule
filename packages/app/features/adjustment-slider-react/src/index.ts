/**
 * Adjustment slider feature for molecule.dev.
 *
 * Bipolar (zero-center) numeric slider tuned for photo-editor / DAW /
 * animation parameter controls (brightness, contrast, saturation, exposure,
 * gain, pan, etc.). Pairs well with `@molecule/app-feature-image-canvas-react`.
 *
 * @example
 * ```tsx
 * import { AdjustmentSlider } from '@molecule/app-adjustment-slider-react'
 *
 * <AdjustmentSlider
 *   label="Exposure"
 *   value={exposure}
 *   onChange={setExposure}
 *   min={-100}
 *   max={100}
 *   step={1}
 *   bipolar
 *   unit="%"
 * />
 * ```
 *
 * @module
 */

export * from './types.js'
export * from './utilities.js'
export * from './AdjustmentSlider.js'
