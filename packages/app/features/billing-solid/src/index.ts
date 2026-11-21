/**
 * Solid pricing page + checkout flow for the molecule.dev billing kit.
 *
 * Components:
 *   `<PricingPage />` — public pricing table that fetches `/api/billing/tiers`
 *   and posts to `/api/billing/checkout` when the user clicks Upgrade.
 *
 *   `<BillingStatusBadge />` — compact account-page status display that
 *   shows the current tier and offers a cancel-subscription button.
 *
 *   `<LimitsList>` / `<LimitsItem>` — building blocks for the
 *   `renderLimits` prop: a stacked checklist row with check / dash icon.
 *
 * Primitives:
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
 * @remarks
 * **Name collision:** `PricingPage` is also exported by
 * `@molecule/app-pricing-page-solid` (a tier-card grid with a monthly/yearly
 * toggle driven by `usePricingTiers()`). THIS package's `<PricingPage>` is the
 * entitlements-kit table with a `renderLimits` prop + compound
 * `<LimitsList>`/`<LimitsItem>` and a built-in `<BillingStatusBadge>` — import
 * from `@molecule/app-billing-solid` when you are wiring
 * `@molecule/api-entitlements`. If you import both packages, alias one to avoid
 * the clash.
 *
 * @example
 * ```tsx
 * import { render } from 'solid-js/web'
 * import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-solid'
 *
 * render(
 *   () => (
 *     <PricingPage
 *       period="month"
 *       renderLimits={(limits) => (
 *         <LimitsList>
 *           <LimitsItem>{`${limits.maxAccounts} accounts`}</LimitsItem>
 *           <LimitsItem included={limits.canExport}>Data export</LimitsItem>
 *         </LimitsList>
 *       )}
 *     />
 *   ),
 *   document.getElementById('app')!,
 * )
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The pricing route renders every tier from `/api/billing/tiers` with name,
 *   price, and per-tier limits — no empty table, no `undefined` cells.
 * - [ ] The signed-in user's CURRENT tier is visibly marked (highlighted / "current
 *   plan") and its Upgrade button is disabled or absent.
 * - [ ] Clicking Upgrade on another tier posts to `/api/billing/checkout` and the
 *   page follows the returned checkout handoff (button is not a dead click).
 * - [ ] `<BillingStatusBadge />` on the account screen shows the live tier, and its
 *   cancel action updates the shown status after confirmation.
 * - [ ] A signed-out visitor can still view the public pricing table.
 * - [ ] If the tiers endpoint fails, the page shows a visible error state — not a
 *   blank page or spinner forever.
 *
 * @module
 */

export * from './BillingStatusBadge.jsx'
export * from './hooks.js'
export * from './PricingPage.jsx'
export * from './types.js'
