/**
 * Types for the Solid pricing page — the same shapes (React prop names) as
 * `@molecule/app-pricing-page-react`, with Solid's node type where React
 * takes a `ReactNode`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { PricingTierEntry, PricingTierPrice } from '@molecule/app-billing-solid'

/**
 * Billing period selector — currently `'month'` or `'year'`. Mirrors the
 * upstream `PricingTierPrice['period']` literal for type-safety.
 */
export type PricingPagePeriod = PricingTierPrice['period']

/** Props for `<PricingPage />`. */
export interface PricingPageProps<TLimits = unknown> {
  /**
   * Optional pre-fetched tiers. When omitted the component fetches them
   * via `usePricingTiers()` (which calls `GET /api/billing/tiers`).
   */
  tiers?: PricingTierEntry<TLimits>[]

  /**
   * Optional override for the checkout handler. The default posts to
   * `/api/billing/checkout` via `useStartCheckout()` and redirects the
   * browser to the returned `checkoutUrl`. Custom apps can pass a
   * function that performs Stripe checkout via a different transport,
   * navigates within a router, etc.
   */
  onCheckout?: (tier: PricingTierEntry<TLimits>, price: PricingTierPrice) => void | Promise<void>

  /** When true (default), renders a monthly/yearly toggle. */
  showPeriodToggle?: boolean

  /** Default billing period for the toggle. Defaults to `'month'`. */
  defaultPeriod?: PricingPagePeriod

  /**
   * Optional render function for the tier-specific limits block. When
   * omitted, `limits` are rendered as a `<dl>` of key-value pairs.
   */
  renderLimits?: (limits: TLimits) => JSX.Element

  /**
   * Optional translation key for the page heading. Defaults to
   * `'pricingPage.heading'`.
   */
  headingKey?: string

  /** Optional English fallback for the heading. */
  headingDefault?: string

  /** Optional className applied to the outer wrapper. */
  className?: string
}

/** Props for `<PlanUpdatedPage />`. */
export interface PlanUpdatedPageProps {
  /**
   * Optional new plan name to include in the heading (e.g. `'Pro'`).
   * When omitted, a generic heading is rendered.
   */
  planName?: string

  /**
   * Optional CTA label / target. Renders a primary button when both
   * `ctaLabel` and one of `onCta` / `ctaHref` are supplied. A typical
   * use is "Continue to dashboard".
   */
  ctaLabel?: JSX.Element

  /** Click handler for the CTA. Mutually exclusive with `ctaHref`. */
  onCta?: (event: unknown) => void

  /** Anchor target for the CTA. Mutually exclusive with `onCta`. */
  ctaHref?: string

  /** Optional className applied to the outer wrapper. */
  className?: string
}
