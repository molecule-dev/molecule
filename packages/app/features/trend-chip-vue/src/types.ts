/**
 * Types for the Vue standalone trend delta chip.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link TrendChip} component. */
export interface TrendChipProps {
  /** Numeric delta to display. Sign drives direction unless `direction` is set. */
  delta: number
  /** Explicit direction override. */
  direction?: 'up' | 'down' | 'flat'
  /** Suffix appended to the delta. Defaults to '%'. */
  suffix?: string
  /**
   * Optional prefix for the value. A string participates in the default aria
   * label; a node is passed as a prop or as the same-named slot — both work.
   */
  prefix?: VNodeChild
  /** Style preset. `'subtle'` = inline plain, `'pill'` = colored pill. Defaults to `'subtle'`. */
  variant?: 'subtle' | 'pill'
  /** Optional accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
