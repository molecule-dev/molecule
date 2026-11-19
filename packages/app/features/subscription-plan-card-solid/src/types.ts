/**
 * Types of `@molecule/app-subscription-plan-card-solid` — the Solid
 * counterpart of `@molecule/app-subscription-plan-card-react`, same props and
 * DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { KitMouseEvent } from '@molecule/app-ui'

/** Props accepted by the {@link SubscriptionPlanCard} component. */
export interface SubscriptionPlanCardProps {
  /** Plan name (e.g. "Pro", "Team", "Enterprise"). */
  name: JSX.Element
  /** Optional tagline / one-liner. */
  description?: JSX.Element
  /** Price string ("$19", "Free", "Custom") — apps own currency formatting. */
  price: JSX.Element
  /** Billing interval label ("/month", "/yr", "per seat"). */
  interval?: JSX.Element
  /** Bullet feature list. */
  features: JSX.Element[]
  /** Primary CTA button label. */
  ctaLabel?: JSX.Element
  /** Click / nav handler (receives the click event, as React's CTA does). */
  onCta?: (event?: KitMouseEvent) => void
  /** When set, the CTA renders as a plain anchor to this URL. */
  ctaHref?: string
  /** Visually highlight as the recommended / popular plan. */
  recommended?: boolean
  /** Optional badge content (e.g. "Most popular"). */
  badge?: JSX.Element
  /** Extra classes. */
  className?: string
}
