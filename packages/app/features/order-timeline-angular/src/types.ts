/**
 * Types of `@molecule/app-order-timeline-angular` — the Angular counterpart of
 * `@molecule/app-order-timeline-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A single step in an order or shipment progress timeline. Node-valued
 * `label`/`detail` arrive as a template (the conformance kit's data-prop node
 * value), or as plain text.
 */
export interface OrderMilestone {
  /** Stable identifier, used as the list key. */
  id: string
  /** Display label ("Placed", "Shipped", "Delivered"): text, or a template. */
  label: string | TemplateRef<unknown>
  /** Optional description / timestamp / location: text, or a template. */
  detail?: string | TemplateRef<unknown>
  /** Is this milestone completed? */
  completed?: boolean
  /** Is this the current (in-progress) milestone? */
  current?: boolean
}

/**
 * Props accepted by {@link OrderTimeline} — the same props
 * `@molecule/app-order-timeline-react` accepts. The node-valued `eta` is
 * projected in Angular (`[slot=eta]`) as well as accepted as a text input.
 */
export interface OrderTimelineProps {
  /** The milestones, rendered in order from earliest to latest. */
  milestones: OrderMilestone[]
  /** Optional ETA / summary line: text, or `[slot=eta]` content. */
  eta?: unknown
  /** Layout orientation. Defaults to `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes on the outer wrapper. */
  className?: string
}
