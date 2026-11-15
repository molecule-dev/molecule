/**
 * Types for the Solid labeled progress bar — `@molecule/app-progress-bar-react`'s
 * prop shapes with Solid's JSX element type.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link ProgressBar} component. */
export interface ProgressBarProps {
  /** Current numeric value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Optional label rendered above the track. */
  label?: JSX.Element
  /** Optional value display rendered on the right of the label row. */
  valueLabel?: JSX.Element
  /** Size preset — maps to ClassMap `progressHeight`. */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant — maps to ClassMap `progressColor`. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by the {@link ProgressCard} component. */
export interface ProgressCardProps {
  /** Card title. */
  title: JSX.Element
  /** Optional supporting description below the title. */
  description?: JSX.Element
  /** Optional icon shown in the card header. */
  icon?: JSX.Element
  /** Current value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Value display on the right of the header (e.g. "73%"). */
  valueLabel?: JSX.Element
  /** ProgressBar color. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the Card wrapper. */
  className?: string
  /** Additional content rendered below the bar. */
  children?: JSX.Element
}
