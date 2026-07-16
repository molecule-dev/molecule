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
 * // mount under /api so the app-side fetches to /api/billing/* line up
 * app.use('/api/billing', createBillingRoutes({ tiers }))
 * ```
 *
 * @remarks
 * - The package looks up `bond('payments', 'stripe')` by default; pass
 *   `provider` or `providerName` to override.
 * - Routes served: `POST /checkout`, `POST /cancel`, `POST /portal` — and
 *   nothing else. The React pricing/billing components
 *   (`@molecule/app-billing-react`) also expect `GET /api/billing/tiers` and
 *   `GET /api/billing/status`; either add those two reads yourself (serve
 *   `tiers.getPricingTiers()` and your subscription lookup), or use the
 *   entitlements-integrated `createBillingRouter` from
 *   `@molecule/api-bonds-default-express`, which serves all four paths.
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
