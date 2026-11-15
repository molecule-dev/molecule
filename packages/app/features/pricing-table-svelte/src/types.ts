/**
 * Types for the Svelte features × plans pricing comparison table.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** A node-valued field: a snippet (a Svelte node value) or plain text. */
type NodeContent = Snippet | string | number

/** Describes a single plan column in the pricing table. */
export interface PricingPlan {
  /** Stable plan id; also the key its feature values are read by. */
  id: string
  /** Plan name, rendered as the column heading. A snippet or a plain string. */
  name: NodeContent
  /** Optional one-line plan description. A snippet or a plain string. */
  description?: NodeContent
  /** Plan price (a formatted string or a snippet). */
  price: NodeContent
  /** Optional billing interval shown beside the price (e.g. `/mo`). */
  interval?: NodeContent
  /** Call to action for this column. */
  cta?: { label: NodeContent; onClick?: () => void; href?: string }
  /** Visually emphasise as recommended / featured. */
  recommended?: boolean
}

/** Describes a single feature row and its per-plan values in the pricing table. */
export interface PricingFeature {
  /** Row label. A snippet or a plain string. */
  label: NodeContent
  /** Per-plan-id values: `true` / `false` / a string / a snippet. */
  values: Record<string, boolean | string | NodeContent>
  /** Optional category / group heading rendered above this row. */
  groupHeading?: NodeContent
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
