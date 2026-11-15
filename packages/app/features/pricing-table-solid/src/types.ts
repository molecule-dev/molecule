/**
 * Types for the Solid features × plans pricing comparison table.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Describes a single plan column in the pricing table. */
export interface PricingPlan {
  /** Stable plan id; also the key its feature values are read by. */
  id: string
  /** Plan name, rendered as the column heading. */
  name: JSX.Element
  /** Optional one-line plan description. */
  description?: JSX.Element
  /** Plan price (a formatted string or a node). */
  price: JSX.Element
  /** Optional billing interval shown beside the price (e.g. `/mo`). */
  interval?: JSX.Element
  /** Call to action for this column. */
  cta?: { label: JSX.Element; onClick?: () => void; href?: string }
  /** Visually emphasise as recommended / featured. */
  recommended?: boolean
}

/** Describes a single feature row and its per-plan values in the pricing table. */
export interface PricingFeature {
  /** Row label. */
  label: JSX.Element
  /** Per-plan-id values: `true` / `false` / a string / a node. */
  values: Record<string, boolean | string | JSX.Element>
  /** Optional category / group heading rendered above this row. */
  groupHeading?: JSX.Element
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
