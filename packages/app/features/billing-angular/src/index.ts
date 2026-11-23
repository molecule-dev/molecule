/**
 * Angular pricing page + checkout flow for the molecule.dev billing kit.
 *
 * Components:
 *   `<PricingPage />` — public pricing table that fetches `/api/billing/tiers`
 *   and posts to `/api/billing/checkout` when the user clicks Upgrade.
 *
 *   `<BillingStatusBadge />` — compact account-page status display that
 *   shows the current tier and offers a cancel-subscription button.
 *
 *   `<LimitsList>` / `<LimitsItem>` — building blocks for the
 *   `renderLimits` template: a stacked checklist row with check / dash icon.
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
 * already exposes the `/api/billing/*` routes), then drop the pricing page
 * onto a `/pricing` route.
 *
 * @remarks
 * **Name collision:** `PricingPage` is also exported by
 * `@molecule/app-pricing-page-angular` (a tier-card grid with a monthly/yearly
 * toggle driven by `usePricingTiers()`). THIS package's `PricingPage` is the
 * entitlements-kit table with a `renderLimits` template + compound
 * `LimitsList`/`LimitsItem` and a built-in billing-status badge — import from
 * `@molecule/app-billing-angular` when you are wiring
 * `@molecule/api-entitlements`. If you import both packages, alias one to avoid
 * the clash.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { BillingStatusBadge, LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-angular'
 *
 * @Component({
 *   selector: 'app-pricing',
 *   standalone: true,
 *   imports: [LimitsItem, LimitsList, PricingPage],
 *   template: `
 *     <section mol-pricing-page period="month">
 *       <ng-template #limits let-limits>
 *         <ul mol-pricing-limits-list>
 *           <li mol-pricing-limits-item>{{ limits.maxAccounts }} accounts</li>
 *           <li mol-pricing-limits-item [included]="limits.canExport">Data export</li>
 *         </ul>
 *       </ng-template>
 *     </section>
 *     <mol-billing-status-badge />
 *   `,
 * })
 * export class PricingRoute {}
 * ```
 *
 * @remarks
 * - Inputs are React's prop names; node props are projected content
 *   (`LimitsList`/`LimitsItem` rows) and the `renderLimits` render function is a
 *   template whose context carries the tier's limits as `$implicit` and `a0`.
 * - The billing-status badge's rendered root varies with the load state (a
 *   `<span>` while loading, a `<div>` once loaded, nothing without a status):
 *   it renders in front of the host's place and the host itself leaves the
 *   page, so React's exact DOM remains.
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
 * - [ ] The billing-status badge on the account screen shows the live tier, and its
 *   cancel action updates the shown status after confirmation.
 * - [ ] A signed-out visitor can still view the public pricing table.
 * - [ ] If the tiers endpoint fails, the page shows a visible error state — not a
 *   blank page or spinner forever.
 *
 * @module
 */

export * from './billing-status-badge.component.js'
export * from './hooks.js'
export * from './limits-item.component.js'
export * from './limits-list.component.js'
export * from './pricing-page.component.js'
export * from './types.js'
