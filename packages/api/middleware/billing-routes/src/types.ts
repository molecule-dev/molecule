/**
 * Type definitions for the billing-routes feature.
 *
 * @module
 */

import type { PaymentProvider, SubscriptionUpdateResult } from '@molecule/api-payments'

/**
 * A tier definition supplied to `defineTiers()`. Each tier represents a single
 * pricing plan (free, pro monthly, pro yearly, team, etc.).
 */
export interface TierDef<TLimits extends Record<string, unknown> = Record<string, unknown>> {
  /** Stable identifier for the tier (e.g. `'free'`, `'pro_monthly'`). */
  id: string
  /** Human-readable label (e.g. `'Pro (Monthly)'`). Not localized — display layer applies i18n. */
  name: string
  /** Optional monthly price in the smallest currency unit (e.g. cents). `0` means free. */
  priceMonthly?: number
  /** Optional yearly price in the smallest currency unit (e.g. cents). */
  priceYearly?: number
  /** Marketing feature bullet keys/strings. The display layer applies i18n. */
  features: string[]
  /** Optional structured limits enforced at the application layer. */
  limits?: TLimits
  /** Optional Stripe Price ID — the value passed to `createCheckoutSession`. */
  stripePriceId?: string
}

/**
 * Accessors returned by `defineTiers()`. These are pure (no side effects) and
 * typed against the same `TLimits` parameter as the input.
 */
export interface TierAccessors<TLimits extends Record<string, unknown> = Record<string, unknown>> {
  /** Returns the full list of tiers in the order they were declared. */
  getPricingTiers(): ReadonlyArray<TierDef<TLimits>>
  /** Returns the tier whose `id` matches, or `undefined`. */
  getTierById(id: string): TierDef<TLimits> | undefined
  /** Returns the tier whose `id` matches; throws if not found. */
  requireTier(id: string): TierDef<TLimits>
  /**
   * Returns `true` iff `tierId` is the same tier as `minimumId` or appears
   * after it in the declaration order. Useful for capability gates like
   * `tierAtLeast(currentId, 'pro_monthly')`.
   */
  tierAtLeast(tierId: string, minimumId: string): boolean
}

/**
 * Result of creating a Stripe-style customer-portal session.
 */
export interface PortalSessionResult {
  /** The portal session ID. */
  id: string
  /** The URL to redirect the user to. */
  url: string
}

/**
 * Provider methods consumed by the billing routes. This is a structural
 * superset of `PaymentProvider` — any provider that supplies these methods
 * is compatible. The Stripe bond satisfies `cancelSubscription` and (via
 * `updateSubscription`) checkout-session creation directly. Portal session
 * creation is optional; if omitted, `POST /billing/portal` returns 501.
 */
export interface BillingProvider extends PaymentProvider {
  /**
   * Creates a customer-portal session. Optional — Stripe-style providers
   * typically expose this; receipt-based providers (Apple/Google) do not.
   */
  createPortalSession?(params: {
    userId: string
    returnUrl?: string
  }): Promise<PortalSessionResult | null>
}

/**
 * Shape of a serializable error response from the billing routes.
 */
export interface BillingErrorBody {
  /** Stable, machine-readable error code. */
  code: string
  /** English fallback message. Apps may localize via response interceptors. */
  message: string
}

/**
 * Result of resolving the authenticated user from a request.
 */
export type AuthResolver = (req: unknown, res: unknown) => string | null | Promise<string | null>

/**
 * Options accepted by `createBillingRoutes()`.
 */
export interface BillingRoutesOptions<
  TLimits extends Record<string, unknown> = Record<string, unknown>,
> {
  /** The tier accessors returned by `defineTiers()`. */
  tiers: TierAccessors<TLimits>
  /**
   * Optional injected provider — if omitted, the routes look up
   * `bond('payments', providerName)`.
   */
  provider?: BillingProvider
  /**
   * Bonded provider name. Defaults to `'stripe'`.
   */
  providerName?: string
  /**
   * Resolves the authenticated user ID from a request. Defaults to reading
   * `res.locals.session.userId` (Express convention).
   */
  resolveUserId?: AuthResolver
  /**
   * Optional override for `SubscriptionUpdateResult` shape used in tests.
   * @internal
   */
  __subscriptionUpdateResult?: SubscriptionUpdateResult
}
