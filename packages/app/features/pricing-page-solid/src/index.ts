/**
 * Solid drop-in pricing page used by every paid molecule.dev flagship app.
 *
 * Components:
 *   `<PricingPage />`      — Renders one card per tier, with optional
 *                            monthly/yearly toggle and Stripe Checkout
 *                            CTA. Reads tiers from `usePricingTiers()`
 *                            unless an explicit `tiers` prop is passed.
 *
 *   `<PlanUpdatedPage />`  — Post-checkout success page rendered at
 *                            Stripe's `success_url` redirect target.
 *
 * It is the Solid counterpart of `@molecule/app-pricing-page-react`: the same
 * exports, the same props (React names) and the same DOM for the same input.
 *
 * Translations live in the companion locale bond
 * `@molecule/app-locales-pricing-page`. The checkout transport lives in
 * `@molecule/app-billing-solid` (`usePricingTiers()` calls
 * `GET /api/billing/tiers`; `useStartCheckout()` posts to
 * `/api/billing/checkout`) — your API must serve those routes and the HTTP
 * client must be wired. NOTE: `@molecule/app-billing-solid` also exports its
 * own different `PricingPage` (compound LimitsList/LimitsItem layout); import
 * from the package whose API you are using. The default checkout redirects
 * with `window.location.assign(checkoutUrl)` — pass `onCheckout` to route
 * through an SPA router or a non-Stripe flow. `<PlanUpdatedPage />` here is
 * the pricing-page-flavored success page; `@molecule/app-legal-pages-solid`
 * also exports a same-named `PlanUpdatedPage`, and a standalone plan-updated
 * page lives in `@molecule/app-plan-updated-page-solid` — import the one
 * whose kit you are using.
 *
 * @example
 * ```tsx
 * import { render } from 'solid-js/web'
 * import { PricingPage } from '@molecule/app-pricing-page-solid'
 * import { addTranslations } from '@molecule/app-i18n'
 * import { en } from '@molecule/app-locales-pricing-page'
 *
 * addTranslations('en', en)
 *
 * render(() => <PricingPage />, document.getElementById('root'))
 * ```
 *
 * @module
 */

export * from './PlanUpdatedPage.jsx'
export * from './PricingPage.jsx'
export * from './types.js'
