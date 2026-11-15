/**
 * Types of `@molecule/app-subscription-plan-card-angular` — the Angular
 * counterpart of `@molecule/app-subscription-plan-card-react`, same props and
 * DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link SubscriptionPlanCard} — the same props
 * `@molecule/app-subscription-plan-card-react` accepts. Node props (`name`,
 * `description`, `price`, `interval`, `ctaLabel`, `badge`) are projected
 * content in Angular (an input cannot carry a node), so they are typed
 * `unknown`: pass node content as `[slot=<name>]` children of the host element,
 * and plain strings as the input. A `features` entry may likewise be a
 * projected node template instead of a string.
 */
export interface SubscriptionPlanCardProps {
  /** Plan name — a string input, or `[slot=name]` projected content. */
  name?: unknown
  /** Optional tagline / one-liner — a string input, or `[slot=description]` content. */
  description?: unknown
  /** Price string — a string input, or `[slot=price]` projected content. */
  price?: unknown
  /** Billing interval label — a string input, or `[slot=interval]` content. */
  interval?: unknown
  /** Bullet feature list; a node entry is a projected template. */
  features: unknown[]
  /** Primary CTA button label — a string input, or `[slot=ctaLabel]` content. */
  ctaLabel?: unknown
  /** Click / nav handler (receives the click event, as React's CTA does). */
  onCta?: (event?: Event) => void
  /** When set, the CTA renders inside a plain anchor to this URL. */
  ctaHref?: string
  /** Visually highlight as the recommended / popular plan. */
  recommended?: boolean
  /** Optional badge content — a string input, or `[slot=badge]` content. */
  badge?: unknown
  /** Extra classes on the card. */
  className?: string
}
