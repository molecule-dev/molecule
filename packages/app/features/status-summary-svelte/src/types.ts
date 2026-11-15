/**
 * Types for the Svelte status-page summary.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Union of possible component health states. */
export type ComponentStatus =
  'operational' | 'degraded' | 'partial-outage' | 'major-outage' | 'maintenance'

/** A node-valued field: plain text, or a snippet rendering the node. */
type StatusField = Snippet | string

/** A single monitored component with its current health status. */
export interface StatusComponent {
  /** Stable identifier, used as the rendered list key. */
  id: string
  /** Component name — plain text or a snippet. */
  name: StatusField
  /** Current health status. */
  status: ComponentStatus
  /** Optional sub-label (SLA %, region, etc.) — plain text or a snippet. */
  subtitle?: StatusField
}

/** A named group of related StatusComponent entries. */
export interface StatusGroup {
  /** Stable identifier, used as the rendered section key. */
  id: string
  /** Group name — plain text or a snippet. */
  name: StatusField
  /** The components in this group. */
  components: StatusComponent[]
}

/** Props for the {@link StatusSummary} component. */
export interface StatusSummaryProps {
  /** Grouped components. */
  groups: StatusGroup[]
  /** Overall summary label (auto-derived if omitted). */
  overallStatus?: ComponentStatus
  /** Optional header content (last updated time, subscribe button). */
  header?: Snippet
  /** Optional below-the-grid slot — typically a recent-incidents list. */
  footer?: Snippet
  /** Extra classes. */
  className?: string
}
