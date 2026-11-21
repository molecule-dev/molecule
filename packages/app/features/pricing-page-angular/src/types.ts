/**
 * Types for the Angular pricing page — the same shapes (React prop names) as
 * `@molecule/app-pricing-page-react`, with Angular's types where React takes
 * a `ReactNode`.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

import type { PricingTierEntry, PricingTierPrice } from '@molecule/app-billing-angular'

/**
 * Billing period selector — currently `'month'` or `'year'`. Mirrors the
 * upstream `PricingTierPrice['period']` literal for type-safety.
 */
export type PricingPagePeriod = PricingTierPrice['period']

/** Props for `<PricingPage />` (the component's inputs). */
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
   * Optional template for the tier-specific limits block (React's
   * `renderLimits` render function; its context carries the tier's limits
   * as `$implicit` and `a0`). When omitted, `limits` are rendered as a
   * `<dl>` of key-value pairs.
   */
  renderLimits?: TemplateRef<TLimits> | null

  /**
   * Optional translation key for the page heading. Defaults to
   * `'pricingPage.heading'`.
   */
  headingKey?: string

  /** Optional English fallback for the heading. */
  headingDefault?: string

  /** Optional className applied to the outer wrapper (the host element). */
  className?: string
}

/** Props for `<PlanUpdatedPage />` (the component's inputs). */
export interface PlanUpdatedPageProps {
  /**
   * Optional new plan name to include in the heading (e.g. `'Pro'`).
   * When omitted, a generic heading is rendered.
   */
  planName?: string

  /**
   * Optional CTA label / target. Renders a primary button when both
   * `ctaLabel` and one of `onCta` / `ctaHref` are supplied. A typical
   * use is "Continue to dashboard". A string input renders as text;
   * `[slot=ctaLabel]` projected content renders in its place.
   */
  ctaLabel?: string

  /** Click handler for the CTA. Mutually exclusive with `ctaHref`. */
  onCta?: (event: unknown) => void

  /** Anchor target for the CTA. Mutually exclusive with `onCta`. */
  ctaHref?: string

  /** Optional className applied to the outer wrapper (the host element). */
  className?: string
}
