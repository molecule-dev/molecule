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
 * One billing-period price row in the public pricing table.
 *
 * Mirrors `@molecule/app-billing-react`'s `PricingTierPrice` — the shape the
 * `<PricingPage />` / `usePricingTiers()` frontend consumes verbatim. Kept as a
 * local re-declaration because API packages must not import `@molecule/app-*`
 * (cross-stack boundary), so the contract is asserted structurally on both sides.
 */
export interface PricingPrice {
  /** Billing cadence. */
  period: 'month' | 'year'
  /** Display string (e.g. `'$19/mo'`, `'$190/yr'`, `'$0'`). */
  price: string
  /**
   * Stripe Price ID used as the checkout line item. `null` for the free tier
   * (and during local dev when the price-id env vars are unset).
   */
  stripePriceId: string | null
  /** Optional savings tag on yearly variants (e.g. `'2 months free'`). */
  savings?: string
}

/**
 * One row of the public pricing table returned by `GET /tiers`.
 *
 * Mirrors `@molecule/app-billing-react`'s `PricingTierEntry`. When the derive
 * path is used, each `TierDef` maps to exactly one entry with a single price
 * (the `TierDef` model treats each billing period as its own tier). Supply
 * `getPricingTiers` in the options to serve a richer catalogue instead.
 */
export interface PricingTierEntry<TLimits = unknown> {
  /** Stable slug used as the row key (matches the source `TierDef.id`). */
  key: string
  /** Display name shown in the page heading and CTA. */
  name: string
  /** Price variants for the tier. Presentation order. */
  prices: PricingPrice[]
  /** Tier-specific limits rendered on the comparison row. */
  limits: TLimits
  /** Whether the tier is billed per seat (rendered as a footnote). */
  perSeat?: boolean
}

/**
 * Response envelope for `GET /tiers`.
 *
 * Mirrors `@molecule/app-billing-react`'s `PricingTiersResponse` — the frontend
 * reads `data` directly, so the envelope key must be `data`.
 */
export interface PricingTiersResponse<TLimits = unknown> {
  /** Tiers ordered as declared (typically free → pro → team). */
  data: PricingTierEntry<TLimits>[]
}

/**
 * Snapshot of the signed-in user's current billing state, returned by
 * `GET /status`.
 *
 * Mirrors `@molecule/app-billing-react`'s `BillingStatus` — the same shape
 * `@molecule/api-bonds-default-express`'s `createBillingRouter` emits from
 * `@molecule/api-entitlements`'s `getEffectiveTier`, so the two are drop-in
 * interchangeable for the frontend.
 */
export interface BillingStatusResponse<TLimits = unknown> {
  /** The user's `users.planKey` (`'free'`, `'stripeMonthly'`, etc.). */
  planKey: string
  /** Tier category — `'free'`, `'pro'`, `'team'`, or any app-defined extension. */
  category: string
  /** Display name (matches the active tier's `PricingTierEntry.name`). */
  name: string
  /** Tier-specific limits the user is currently entitled to. */
  limits: TLimits
  /** True when the user is on the default (free) tier. */
  isFree: boolean
}

/**
 * Formats a price expressed in the smallest currency unit (e.g. cents) into
 * the display string `GET /tiers` emits for a `PricingPrice`.
 *
 * @param amountMinor - Price in the smallest currency unit (e.g. `1200` = $12.00).
 * @param period - The billing cadence the amount is for.
 * @returns A display string (e.g. `'$12/mo'`, `'$120/yr'`, `'$0'`).
 */
export type PriceFormatter = (amountMinor: number, period: 'month' | 'year') => string

/**
 * Resolves the authenticated user's current billing status for `GET /status`.
 *
 * Kept injectable so this package stays decoupled from any specific
 * entitlements / tier store: flagship apps pass a resolver backed by
 * `@molecule/api-entitlements`'s `getEffectiveTier`. Returning `null` (or not
 * supplying a resolver at all) makes `GET /status` fall back to the default
 * (first / free) tier snapshot derived from the configured tiers.
 */
export type BillingStatusResolver<TLimits = unknown> = (
  userId: string,
  req: unknown,
  res: unknown,
) => BillingStatusResponse<TLimits> | null | Promise<BillingStatusResponse<TLimits> | null>

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
   * Optional override that returns the public pricing table in the frontend's
   * `PricingTierEntry` shape. When omitted, `GET /tiers` derives one entry per
   * configured `TierDef`. Supply this to serve a richer catalogue (multiple
   * period variants per tier, `savings` tags, `perSeat`) — it is also the hook
   * `@molecule/api-bonds-default-express` uses to delegate its `/tiers` here.
   */
  getPricingTiers?: () => ReadonlyArray<PricingTierEntry<TLimits>>
  /**
   * Optional formatter turning a `TierDef` price (smallest currency unit) into
   * the display string `GET /tiers` emits. Defaults to a USD formatter
   * (`$12/mo`, `$120/yr`, `$0`). Only used by the derive path — ignored when
   * `getPricingTiers` is supplied.
   */
  formatPrice?: PriceFormatter
  /**
   * Resolves the authenticated user's current billing status for `GET /status`.
   * Injectable so the routes stay decoupled from any specific entitlements
   * store. When omitted (or when it returns `null`), `GET /status` returns the
   * default (first / free) tier snapshot for any authenticated user.
   */
  resolveStatus?: BillingStatusResolver<TLimits>
  /**
   * Optional override for `SubscriptionUpdateResult` shape used in tests.
   * @internal
   */
  __subscriptionUpdateResult?: SubscriptionUpdateResult
}
