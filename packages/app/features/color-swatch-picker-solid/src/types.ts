/**
 * Types for the Solid color-swatch picker.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A single color option in the swatch picker with its value, CSS color, and optional label. */
export interface ColorSwatch {
  /** Value stored in state (can be the raw color or a semantic id). */
  value: string
  /** CSS color (any valid color string). */
  color: string
  /** Optional label shown as tooltip / aria-label. */
  label?: string
}

/**
 * Props accepted by the {@link ColorSwatchPicker} component — the same props
 * `@molecule/app-color-swatch-picker-react` accepts.
 */
export interface ColorSwatchPickerProps {
  /** Swatch definitions. */
  swatches: ColorSwatch[]
  /** Currently selected swatch value. */
  value: string
  /** Called when a swatch is picked. */
  onChange: (value: string) => void
  /** Swatch diameter in pixels. Defaults to 28. */
  size?: number
  /** Gap between swatches. */
  gap?: 'xs' | 'sm' | 'md'
  /** Optional child rendered below (e.g. a live preview). */
  preview?: JSX.Element
  /** Extra classes. */
  className?: string
  /** `aria-label` for the group. */
  ariaLabel?: string
}
