/**
 * Types for the AdjustmentSlider feature package.
 *
 * @module
 */

/** Function signature used to format the rendered numeric value. */
export type AdjustmentSliderFormatter = (value: number) => string

/** Public props for `<AdjustmentSlider>`. */
export interface AdjustmentSliderProps {
  /** Visible label (rendered to the left of the slider). */
  label: string
  /** Current numeric value. */
  value: number
  /** Called whenever the slider value changes. */
  onChange: (value: number) => void
  /** Lower bound. Defaults to `-100`. */
  min?: number
  /** Upper bound. Defaults to `100`. */
  max?: number
  /** Step increment. Defaults to `1`. */
  step?: number
  /**
   * When `true` (default), the slider is bipolar with a center mark at zero
   * and double-click / Reset returns the value to `0`. When `false`, the
   * slider is unipolar (a normal range slider) and double-click resets to
   * `min`.
   */
  bipolar?: boolean
  /** Optional unit suffix (e.g. `'%'`, `'dB'`) appended to the default formatter. */
  unit?: string
  /**
   * Optional formatter overriding the default `value + (unit || '')` display.
   * Useful for rendering e.g. `+12` (signed) or `1.4 EV`.
   */
  format?: AdjustmentSliderFormatter
  /**
   * Optional reset handler. When provided, double-clicking the slider OR
   * pressing the visual Reset button calls this instead of resetting to
   * the default reset value.
   */
  onReset?: () => void
  /** Optional extra class names appended to the outer container. */
  className?: string
  /** Optional `data-mol-id` for AI-agent / E2E targeting. */
  dataMolId?: string
}
