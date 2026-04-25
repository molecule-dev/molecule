/**
 * React pricing page + checkout flow for the molecule.dev billing kit.
 *
 * Components:
 *   `<PricingPage />` — public pricing table that fetches `/api/billing/tiers`
 *   and posts to `/api/billing/checkout` when the user clicks Upgrade.
 *
 *   `<BillingStatusBadge />` — compact account-page status display that
 *   shows the current tier and offers a cancel-subscription button.
 *
 * Hooks:
 *   `usePricingTiers<TLimits>()`        → `UseHttpResult<PricingTiersResponse<TLimits>>`
 *   `useBillingStatus<TLimits>()`       → `UseHttpResult<BillingStatus<TLimits>>`
 *   `useStartCheckout()`                → `{ data, loading, error, start(priceId) }`
 *   `useCancelSubscription()`           → `{ data, loading, error, cancel() }`
 *
 * The API side of this kit lives in `@molecule/api-entitlements` +
 * `@molecule/api-payments-stripe`. Wire those into your project (any
 * mlcl flagship template that includes `@molecule/api-entitlements`
 * already exposes the `/api/billing/*` routes), then drop `<PricingPage />`
 * onto a `/pricing` route.
 *
 * @example
 * ```tsx
 * import { PricingPage } from '@molecule/app-billing-react'
 * import type { PersonalFinanceLimits } from '../tiers'
 *
 * const Pricing = () => (
 *   <PricingPage<PersonalFinanceLimits>
 *     period="month"
 *     renderLimits={(l) => (
 *       <ul>
 *         <li>{l.maxAccounts} accounts</li>
 *         <li>{l.maxTransactionsPerMonth} transactions / month</li>
 *       </ul>
 *     )}
 *   />
 * )
 * ```
 *
 * @module
 */

export * from './types.js'
export * from './hooks.js'
export * from './PricingPage.js'
export * from './BillingStatusBadge.js'
