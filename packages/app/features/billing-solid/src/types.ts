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
