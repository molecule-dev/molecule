/**
 * Types for the Svelte labeled progress bar — `@molecule/app-progress-bar-react`'s
 * prop shapes with Svelte's snippet type.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link ProgressBar} component. */
export interface ProgressBarProps {
  /** Current numeric value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Optional label rendered above the track: a snippet, or a plain string. */
  label?: Snippet | string
  /** Optional value display on the right of the label row: a snippet, or a plain string. */
  valueLabel?: Snippet | string
  /** Size preset — maps to ClassMap `progressHeight`. */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant — maps to ClassMap `progressColor`. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by the {@link ProgressCard} component. */
export interface ProgressCardProps {
  /** Card title: a snippet, or a plain string. */
  title: Snippet | string
  /** Optional supporting description below the title: a snippet, or a plain string. */
  description?: Snippet | string
  /** Optional icon shown in the card header: a snippet, or a plain string. */
  icon?: Snippet | string
  /** Current value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Value display on the right of the header (e.g. "73%"): a snippet, or a plain string. */
  valueLabel?: Snippet | string
  /** ProgressBar color. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the Card wrapper. */
  className?: string
  /** Additional content rendered below the bar. */
  children?: Snippet
}
