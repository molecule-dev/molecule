/**
 * Types of `@molecule/app-order-timeline-vue` — the Vue counterpart of
 * `@molecule/app-order-timeline-react`, the same props (React names) and the
 * same DOM for the same input.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** A single step in an order or shipment progress timeline. */
export interface OrderMilestone {
  /** Stable identifier, used as the list key. */
  id: string
  /** Display label ("Placed", "Shipped", "Delivered"): text, or a node. */
  label: VNodeChild
  /** Optional description / timestamp / location: text, or a node. */
  detail?: VNodeChild
  /** Is this milestone completed? */
  completed?: boolean
  /** Is this the current (in-progress) milestone? */
  current?: boolean
}

/** Props accepted by the {@link OrderTimeline} component. */
export interface OrderTimelineProps {
  /** The milestones, rendered in order from earliest to latest. */
  milestones: OrderMilestone[]
  /**
   * Optional ETA / summary line: a prop, or the same-named slot. Text and
   * nodes both work.
   */
  eta?: VNodeChild
  /** Layout orientation. Defaults to `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes on the outer wrapper. */
  className?: string
}
