/**
 * Types of `@molecule/app-status-summary-angular` — the Angular counterpart of
 * `@molecule/app-status-summary-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A node-valued field (React's `ReactNode`): in Angular a field is text (a
 * string or number) or an `ng-template` reference rendered through
 * `NgTemplateOutlet` where the node would render.
 */
type StatusSummaryNode = TemplateRef<unknown> | string | number

/** Union of possible component health states. */
export type ComponentStatus =
  'operational' | 'degraded' | 'partial-outage' | 'major-outage' | 'maintenance'

/** A single monitored component with its current health status. */
export interface StatusComponent {
  /** Stable identifier, used as the rendered list key. */
  id: string
  /** Component name — text or an `ng-template` reference. */
  name: StatusSummaryNode
  /** Current health status. */
  status: ComponentStatus
  /** Optional sub-label (SLA %, region, etc.) — text or an `ng-template` reference. */
  subtitle?: StatusSummaryNode
}

/** A named group of related StatusComponent entries. */
export interface StatusGroup {
  /** Stable identifier, used as the rendered section key. */
  id: string
  /** Group name — text or an `ng-template` reference. */
  name: StatusSummaryNode
  /** The components in this group. */
  components: StatusComponent[]
}

/**
 * Props accepted by {@link StatusSummary} — the same props
 * `@molecule/app-status-summary-react` accepts. The node props (`header`,
 * `footer`) are projected content in Angular (an input cannot carry a node),
 * so they are typed `unknown`: pass them in the host template
 * (`[slot=header]` / `[slot=footer]`), not as values.
 */
export interface StatusSummaryProps {
  /** Grouped components. */
  groups: StatusGroup[]
  /** Overall summary label (auto-derived if omitted). */
  overallStatus?: ComponentStatus
  /** Header content (last updated time, subscribe button), projected as `[slot=header]`. */
  header?: unknown
  /** Below-the-grid content (incident list), projected as `[slot=footer]`. */
  footer?: unknown
  /** Extra classes. */
  className?: string
}
