/**
 * Types for the Svelte standalone trend delta chip.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link TrendChip} component. */
export interface TrendChipProps {
  /** Numeric delta to display. Sign drives direction unless `direction` is set. */
  delta: number
  /** Explicit direction override. */
  direction?: 'up' | 'down' | 'flat'
  /** Suffix appended to the delta. Defaults to '%'. */
  suffix?: string
  /**
   * Optional prefix for the value. A string or number participates in the
   * default aria label; a snippet renders inline.
   */
  prefix?: Snippet | string | number
  /** Style preset. `'subtle'` = inline plain, `'pill'` = colored pill. Defaults to `'subtle'`. */
  variant?: 'subtle' | 'pill'
  /** Optional accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
