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
 *   `<LimitsList>` / `<LimitsItem>` — building blocks for the
 *   `renderLimits` prop: a stacked checklist row with check / dash icon,
 *   e.g. `renderLimits={(l) => (
 *     <LimitsList>
 *       <LimitsItem>{l.maxAccounts} accounts</LimitsItem>
 *       <LimitsItem included={l.canExport}>Data export</LimitsItem>
 *     </LimitsList>
 *   )}`
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
 * @remarks
 * **It does not define the API.** `<PricingPage>` GETs `/api/billing/tiers`
 * (`{ data: PricingTierEntry[] }`) on mount and POSTs `{ priceId }` to
 * `/api/billing/checkout` on Upgrade; `<BillingStatusBadge>` GETs
 * `/api/billing/status`. Those paths are hard-coded — the server routes come
 * from `@molecule/api-entitlements`. A tier whose price for the selected
 * `period` has `stripePriceId: null` renders a disabled "Current plan"
 * button. After checkout it calls `window.location.assign(checkoutUrl)`
 * (new subscriber) or `window.location.reload()` (plan change).
 *
 * **Required wiring** (each missing piece throws on render): a
 * `MoleculeProvider` (from `@molecule/app-react`) with `http` (the hooks
 * use `useHttpClient()`), `auth` (`useAuth()`) and `i18n`
 * (`useTranslation()`); `setClassMap(...)`; and `setIconSet(...)` from
 * `@molecule/app-icons` for the check / dash icons.
 *
 * **Name collision:** `PricingPage` is also exported by
 * `@molecule/app-pricing-page-react` (a tier-card grid with a monthly/yearly
 * toggle driven by `usePricingTiers()`). THIS package's `<PricingPage>` is the
 * entitlements-kit table with a `renderLimits` prop + compound
 * `<LimitsList>`/`<LimitsItem>` and a built-in `<BillingStatusBadge>` — import
 * from `@molecule/app-billing-react` when you are wiring
 * `@molecule/api-entitlements`. If you import both packages, alias one to avoid
 * the clash.
 *
 * @example
 * ```tsx
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
 * import { createFetchClient } from '@molecule/app-http'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import { setIconSet } from '@molecule/app-icons'
 * import { iconSet } from '@molecule/app-icons-molecule'
 * import * as billingLocales from '@molecule/app-locales-billing'
 * import { MoleculeProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * setIconSet(iconSet)
 * registerLocaleModule(billingLocales)
 * const http = createFetchClient() // the hooks call `/api/billing/*` on this client
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 *
 * // Must match the `limits` your API's tier registry returns.
 * interface TierLimits {
 *   maxProjects: number
 *   canExport: boolean
 * }
 *
 * export function Pricing() {
 *   return (
 *     <MoleculeProvider http={http} auth={authClient} i18n={getI18nProvider()}>
 *       <PricingPage<TierLimits>
 *         period="month"
 *         renderLimits={(limits) => (
 *           <LimitsList>
 *             <LimitsItem>{limits.maxProjects} projects</LimitsItem>
 *             <LimitsItem included={limits.canExport}>Data export</LimitsItem>
 *           </LimitsList>
 *         )}
 *       />
 *     </MoleculeProvider>
 *   )
 * }
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

export * from './BillingStatusBadge.js'
export * from './hooks.js'
export * from './PricingPage.js'
export * from './types.js'
