/**
 * Drop-in `/billing/*` Express routes + `defineTiers()` helper for molecule.dev.
 *
 * Replaces the near-identical `routes/billing.ts` boilerplate every paid
 * flagship currently ships. Wires to `@molecule/api-payments-stripe` (or any
 * compatible `PaymentProvider` + `createPortalSession`) via the bond system.
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
 * app.use('/billing', createBillingRoutes({ tiers }))
 * ```
 *
 * @remarks
 * - The package looks up `bond('payments', 'stripe')` by default; pass
 *   `provider` or `providerName` to override.
 * - Error responses use the `BillingErrorBody` shape (`{ code, message }`) —
 *   apps may layer i18n on top via response interceptors.
 *
 * @module
 */

export * from './routes.js'
export * from './tiers.js'
export * from './types.js'
