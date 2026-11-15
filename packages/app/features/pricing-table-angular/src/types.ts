/**
 * Types for the Angular features × plans pricing comparison table.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** A node-valued field: a template (projected content) or plain text. */
type NodeContent = TemplateRef<unknown> | string | number

/** Describes a single plan column in the pricing table. */
export interface PricingPlan {
  /** Stable plan id; also the key its feature values are read by. */
  id: string
  /** Plan name, rendered as the column heading. A template or a plain string. */
  name: NodeContent
  /** Optional one-line plan description. A template or a plain string. */
  description?: NodeContent
  /** Plan price (a formatted string or a template). */
  price: NodeContent
  /** Optional billing interval shown beside the price (e.g. `/mo`). */
  interval?: NodeContent
  /**
   * Call to action for this column. `onClick` receives the click event, as
   * React's `Button` passes it.
   */
  cta?: { label: NodeContent; onClick?: (event?: MouseEvent) => void; href?: string }
  /** Visually emphasise as recommended / featured. */
  recommended?: boolean
}

/** Describes a single feature row and its per-plan values in the pricing table. */
export interface PricingFeature {
  /** Row label. A template or a plain string. */
  label: NodeContent
  /** Per-plan-id values: `true` / `false` / a string / a template. */
  values: Record<string, boolean | string | NodeContent>
  /** Optional category / group heading rendered above this row. */
  groupHeading?: NodeContent
}

/** Props accepted by {@link PricingTable} — the same props the React package accepts. */
export interface PricingTableProps {
  /** The plan columns, left to right. */
  plans: PricingPlan[]
  /** The feature rows, top to bottom. */
  features: PricingFeature[]
  /** Extra classes on the outer wrapper. */
  className?: string
}
