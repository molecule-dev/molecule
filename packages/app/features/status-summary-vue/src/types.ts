/**
 * Types for the Vue status-page summary.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Union of possible component health states. */
export type ComponentStatus =
  'operational' | 'degraded' | 'partial-outage' | 'major-outage' | 'maintenance'

/** A single monitored component with its current health status. */
export interface StatusComponent {
  /** Stable identifier, used as the rendered list key. */
  id: string
  /** Component name — passed as a prop or the same-named slot. */
  name: VNodeChild
  /** Current health status. */
  status: ComponentStatus
  /** Optional sub-label (SLA %, region, etc.). */
  subtitle?: VNodeChild
}

/** A named group of related StatusComponent entries. */
export interface StatusGroup {
  /** Stable identifier, used as the rendered section key. */
  id: string
  /** Group name — passed as a prop or the same-named slot. */
  name: VNodeChild
  /** The components in this group. */
  components: StatusComponent[]
}

/** Props for the {@link StatusSummary} component. */
export interface StatusSummaryProps {
  /** Grouped components. */
  groups: StatusGroup[]
  /** Overall summary label (auto-derived if omitted). */
  overallStatus?: ComponentStatus
  /**
   * Optional header content (last updated time, subscribe button). Passed as a
   * prop or as the same-named slot — both work.
   */
  header?: VNodeChild
  /**
   * Optional below-the-grid slot — typically a recent-incidents list. Passed
   * as a prop or as the same-named slot — both work.
   */
  footer?: VNodeChild
  /** Extra classes. */
  className?: string
}
