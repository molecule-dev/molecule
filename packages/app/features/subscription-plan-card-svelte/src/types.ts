/**
 * Types of `@molecule/app-subscription-plan-card-svelte` — the Svelte
 * counterpart of `@molecule/app-subscription-plan-card-react`, same props and
 * DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link SubscriptionPlanCard} component. */
export interface SubscriptionPlanCardProps {
  /** Plan name (e.g. "Pro", "Team", "Enterprise") — a snippet or a plain string. */
  name: Snippet | string
  /** Optional tagline / one-liner — a snippet or a plain string. */
  description?: Snippet | string
  /** Price string ("$19", "Free", "Custom") — a snippet or a plain string. */
  price: Snippet | string
  /** Billing interval label ("/month", "/yr", "per seat") — a snippet or a plain string. */
  interval?: Snippet | string
  /** Bullet feature list; each entry is a snippet or a plain string. */
  features: (Snippet | string)[]
  /** Primary CTA button label — a snippet or a plain string. */
  ctaLabel?: Snippet | string
  /** Click / nav handler (receives the click event, as React's CTA does). */
  onCta?: (event?: MouseEvent) => void
  /** When set, the CTA renders as a plain anchor to this URL. */
  ctaHref?: string
  /** Visually highlight as the recommended / popular plan. */
  recommended?: boolean
  /** Optional badge content (e.g. "Most popular") — a snippet or a plain string. */
  badge?: Snippet | string
  /** Extra classes. */
  className?: string
}
