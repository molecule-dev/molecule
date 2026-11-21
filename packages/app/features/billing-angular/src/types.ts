/**
 * Type definitions mirroring the API-side billing endpoint contracts.
 *
 * These types match the JSON shapes returned by `@molecule/api-entitlements`
 * + `@molecule/api-payments-stripe` when an app exposes the standard billing
 * routes:
 *
 * - `GET  /api/billing/tiers`   → `{ data: PricingTierEntry[] }`
 * - `GET  /api/billing/status`  → `BillingStatus`
 * - `POST /api/billing/checkout` body: `{ priceId: string }`
 *                                response: `{ checkoutUrl }` | `{ updated, subscription }`
 * - `POST /api/billing/cancel`  → `{ canceled: true }`
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * One billing period offered for a tier — typically `month` or `year` —
 * with the human-readable price string and the Stripe price ID. The price
 * ID may be `null` for the free tier (no Stripe product).
 */
export interface PricingTierPrice {
  /** Billing cadence. */
  period: 'month' | 'year'

  /** Display string (e.g. `'$19/mo'`, `'$190/yr'`, `'$0'`). */
  price: string

  /**
   * Stripe Price ID used as the line item when the user clicks Upgrade.
   * `null` for free tiers and during local dev when env vars are unset.
   */
  stripePriceId: string | null

  /** Optional savings tag on yearly variants (e.g. `'2 months free'`). */
  savings?: string
}

/**
 * One row of the public pricing table. Apps can declare any number of
 * `period` variants per tier (typically a `month` and `year` pair).
 */
export interface PricingTierEntry<TLimits = unknown> {
  /** Stable slug used as a row key (`'free'`, `'pro'`, `'team'`). */
  key: string

  /** Display name shown in the page heading and CTA. */
  name: string

  /** Price variants for the tier. Order is presentation order. */
  prices: PricingTierPrice[]

  /** Tier-specific limits — render any/all of these on the comparison row. */
  limits: TLimits

  /** Whether the tier is billed per seat (rendered as a footnote). */
  perSeat?: boolean
}

/** Response envelope for `GET /api/billing/tiers`. */
export interface PricingTiersResponse<TLimits = unknown> {
  /** Tiers ordered as the API returns them (typically free → pro → team). */
  data: PricingTierEntry<TLimits>[]
}

/**
 * Snapshot of the signed-in user's current billing state. Returned by
 * `GET /api/billing/status` once the user is authenticated.
 */
export interface BillingStatus<TLimits = unknown> {
  /** The user's `users.planKey` (`'free'`, `'stripeMonthly'`, etc.). */
  planKey: string

  /** Tier category — `'free'`, `'pro'`, `'team'`, or any app-defined extension. */
  category: string

  /** Display name (matches `PricingTierEntry.name` for the active tier). */
  name: string

  /** Tier-specific limits the user is currently entitled to. */
  limits: TLimits

  /** True when the user is on the registry default (free) tier. */
  isFree: boolean
}

/** Response from `POST /api/billing/checkout`. Either `checkoutUrl` or `updated` is set. */
export interface CheckoutResponse {
  /** Stripe Checkout URL — set when the user has no active subscription yet. */
  checkoutUrl?: string

  /** True when the user already had a subscription that was updated in place. */
  updated?: boolean

  /** Updated subscription metadata (only when `updated === true`). */
  subscription?: {
    expiresAt?: string
    autoRenews?: boolean
  }
}

/** Response from `POST /api/billing/cancel`. */
export interface CancelResponse {
  /** True when the cancellation request was accepted. */
  canceled?: boolean

  /** Localized error message when cancellation failed. */
  error?: string
}

/**
 * Props for `[mol-billing-status-badge]` — the same props
 * `@molecule/app-billing-react`'s `<BillingStatusBadge />` accepts.
 */
export interface BillingStatusBadgeProps {
  /**
   * Optional callback invoked after a successful cancel. Most apps will
   * navigate the user back to settings or refresh the page from here.
   */
  onCanceled?: () => void

  /** Optional className applied to the outer wrapper. */
  className?: string

  /**
   * Whether to render the cancel-subscription button when the user is
   * on a paid tier. Defaults to `true`.
   */
  showCancel?: boolean
}

/**
 * Props for `[mol-pricing-limits-item]` — the same props
 * `@molecule/app-billing-react`'s `<LimitsItem>` accepts. Node props are
 * projected content in Angular (an input cannot carry a node), so the row's
 * label is the element's content.
 */
export interface LimitsItemProps {
  /** Row content (typically a translated label + number), projected as the element's content. */
  children?: unknown
  /**
   * Whether this feature is included in the tier. When `false`, the row
   * renders muted with a dash glyph instead of the check icon. Defaults to
   * `true`.
   */
  included?: boolean
}

/**
 * Props for `[mol-pricing-page]` — the same props
 * `@molecule/app-billing-react`'s `<PricingPage />` accepts. The render
 * function becomes a template whose context carries the tier's limits.
 */
export interface PricingPageProps<TLimits = unknown> {
  /**
   * Optional billing-period selector. Defaults to `'month'`. Pass `'year'`
   * to render the yearly column. The component falls back to whatever the
   * tier provides when the requested period is missing.
   */
  period?: PricingTierPrice['period']

  /**
   * Optional template for the tier-specific limits column. Its context
   * carries the tier's limits as `$implicit` and `a0`. Defaults to a stacked
   * checklist rendering numeric / boolean values with a check glyph.
   */
  renderLimits?: TemplateRef<TLimits> | null

  /**
   * Optional override for the page-level heading translation key.
   * Defaults to `'billing.pricing.heading'`.
   */
  headingKey?: string

  /** Optional English fallback for the heading. Defaults to `'Choose your plan'`. */
  headingDefault?: string

  /**
   * Optional sub-heading shown under the page heading. Pass `null` to
   * suppress. Defaults to a translated "Pick the plan that fits…" line.
   */
  subheadingKey?: string | null
  /** English fallback for the sub-heading. */
  subheadingDefault?: string

  /**
   * Optional className applied to the outer wrapper, useful when embedding
   * the page in an existing layout.
   */
  className?: string

  /**
   * Path the browser is sent to when an anonymous visitor clicks a paid
   * tier's upgrade CTA. Defaults to `/login`. Set to `null` to disable
   * the redirect.
   */
  unauthenticatedRedirect?: string | null

  /**
   * Optional tier key to highlight as "most popular". When omitted the
   * highest-priced tier with a real stripePriceId is auto-selected; pass
   * `null` to disable highlighting entirely.
   */
  popularTierKey?: string | null

  /**
   * Optional font-family stack applied inline to the page heading, tier
   * names, and hero price. Pass `null` to inherit from the theme.
   */
  headlineFontFamily?: string | null
}
