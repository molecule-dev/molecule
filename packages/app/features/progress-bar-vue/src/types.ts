/**
 * Types for the Vue labeled progress bar — `@molecule/app-progress-bar-react`'s
 * prop shapes with Vue's node type.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link ProgressBar} component. */
export interface ProgressBarProps {
  /** Current numeric value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Optional label rendered above the track (a node, or its same-named slot). */
  label?: VNodeChild
  /** Optional value display on the right of the label row (a node, or its same-named slot). */
  valueLabel?: VNodeChild
  /** Size preset — maps to ClassMap `progressHeight`. */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant — maps to ClassMap `progressColor`. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by the {@link ProgressCard} component. */
export interface ProgressCardProps {
  /** Card title (a node, or its same-named slot). */
  title: VNodeChild
  /** Optional supporting description below the title (a node, or its same-named slot). */
  description?: VNodeChild
  /** Optional icon shown in the card header (a node, or its same-named slot). */
  icon?: VNodeChild
  /** Current value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Value display on the right of the header (a node, or its same-named slot). */
  valueLabel?: VNodeChild
  /** ProgressBar color. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the Card wrapper. */
  className?: string
  /** Additional content rendered below the bar (the default slot). */
  children?: VNodeChild
}
