/**
 * Types for the Vue pricing / subscription plan card.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props for the {@link SubscriptionPlanCard} component. */
export interface SubscriptionPlanCardProps {
  /**
   * Plan name (e.g. "Pro", "Team", "Enterprise"). Passed as a prop or as the
   * same-named slot — both work.
   */
  name?: VNodeChild
  /** Optional tagline / one-liner — a prop or the same-named slot. */
  description?: VNodeChild
  /**
   * Price string ("$19", "Free", "Custom") — apps own currency formatting.
   * Passed as a prop or as the same-named slot.
   */
  price?: VNodeChild
  /** Billing interval label ("/month", "/yr", "per seat") — a prop or the same-named slot. */
  interval?: VNodeChild
  /** Bullet feature list. */
  features: VNodeChild[]
  /** Primary CTA button label — a prop or the same-named slot. */
  ctaLabel?: VNodeChild
  /** Click / nav handler (receives the click event, as React's CTA does). */
  onCta?: (event?: MouseEvent) => void
  /** When set, the CTA renders as a plain anchor to this URL. */
  ctaHref?: string
  /** Visually highlight as the recommended / popular plan. */
  recommended?: boolean
  /** Optional badge content (e.g. "Most popular") — a prop or the same-named slot. */
  badge?: VNodeChild
  /** Extra classes. */
  className?: string
}
