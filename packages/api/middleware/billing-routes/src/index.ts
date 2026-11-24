/**
 * Drop-in `/billing/*` Express routes + `defineTiers()` helper for molecule.dev.
 *
 * Serves the COMPLETE `/billing/*` contract `@molecule/app-billing-react`
 * consumes — `GET /tiers`, `GET /status`, `POST /checkout`, `POST /cancel`
 * (plus an optional `POST /portal`) — so `<PricingPage />`,
 * `<BillingStatusBadge />`, `usePricingTiers()`, and `useBillingStatus()` work
 * against it with no gaps. Replaces the near-identical `routes/billing.ts`
 * boilerplate every paid flagship ships. Wires to `@molecule/api-payments-stripe`
 * (or any compatible `PaymentProvider` + `createPortalSession`) via the bond system.
 *
 * @example
 * ```typescript
 * import { createBillingRoutes, defineTiers } from '@molecule/api-billing-routes'
 *
 * const tiers = defineTiers([
 *   { id: 'free', name: 'Free', features: ['Up to 5 projects'], priceMonthly: 0 },
 *   {
 *     id: 'pro_monthly',
 *     name: 'Pro (Monthly)',
 *     features: ['Unlimited projects', 'Priority support'],
 *     priceMonthly: 1200,
 *     stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
 *   },
 * ])
 *
 * // Mount under /api/billing so the app-side fetches to /api/billing/* line up.
 * app.use('/api/billing', createBillingRoutes({ tiers }))
 * ```
 *
 * @remarks
 * - The routes use the bonded payments provider that can start a checkout
 *   (`updateSubscription`): Stripe, PayPal or the capture provider alike, the one
 *   bonded as `'stripe'` when several can. Pass `provider` or `providerName` to choose.
 * - Routes served: `GET /tiers`, `GET /status`, `POST /checkout`,
 *   `POST /cancel`, `POST /portal`. `GET /tiers` returns
 *   `{ data: PricingTierEntry[] }` — derived one-per-`TierDef` by default, or
 *   `options.getPricingTiers()` for a richer catalogue. A price is for sale only
 *   when it carries a `stripePriceId`, and it carries one only while the bonded
 *   provider can start a checkout: a paid tier with no price id (its env var unset)
 *   is listed with nothing to buy, and a warning names it at boot.
 * - `GET /status` returns `{ planKey, category, name, limits, isFree }` for the
 *   user's stored `users.planKey` (read through the bonded `datastore`), the first,
 *   free tier when it is unset or `planExpiresAt` has passed. Pass
 *   `options.resolveStatus` (e.g. backed by `@molecule/api-entitlements`'s
 *   `getEffectiveTier`) to report plans from another store.
 * - Mount so the resulting app-facing paths are `/api/billing/...` — the
 *   scaffolded Vite dev proxy forwards `/api` WITHOUT rewriting.
 * - Naming: `@molecule/api-entitlements` exports a DIFFERENT `defineTiers`
 *   (registry-object signature). Do not mix the two in one file without
 *   aliasing.
 * - Error responses use the `BillingErrorBody` shape (`{ code, message }`) —
 *   apps may layer i18n on top via response interceptors.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './secrets.js'
export * from './tiers.js'
export * from './types.js'
