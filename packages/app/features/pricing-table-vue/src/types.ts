/**
 * Types for the Vue features × plans pricing comparison table.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Describes a single plan column in the pricing table. */
export interface PricingPlan {
  /** Stable plan id; also the key its feature values are read by. */
  id: string
  /** Plan name, rendered as the column heading. */
  name: VNodeChild
  /** Optional one-line plan description. */
  description?: VNodeChild
  /** Plan price (a formatted string or a node). */
  price: VNodeChild
  /** Optional billing interval shown beside the price (e.g. `/mo`). */
  interval?: VNodeChild
  /** Call to action for this column. */
  cta?: { label: VNodeChild; onClick?: () => void; href?: string }
  /** Visually emphasise as recommended / featured. */
  recommended?: boolean
}

/** Describes a single feature row and its per-plan values in the pricing table. */
export interface PricingFeature {
  /** Row label. */
  label: VNodeChild
  /** Per-plan-id values: `true` / `false` / a string / a node. */
  values: Record<string, boolean | string | VNodeChild>
  /** Optional category / group heading rendered above this row. */
  groupHeading?: VNodeChild
}

/** Props accepted by the {@link PricingTable} component (React's prop names). */
export interface PricingTableProps {
  /** The plan columns, left to right. */
  plans: PricingPlan[]
  /** The feature rows, top to bottom. */
  features: PricingFeature[]
  /** Extra classes on the outer wrapper. */
  className?: string
}
