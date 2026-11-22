/**
 * Angular drop-in pricing page used by every paid molecule.dev flagship app.
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
 * It is the Angular counterpart of `@molecule/app-pricing-page-react`: the
 * same exports, the same inputs (React prop names) and the same DOM for the
 * same input.
 *
 * Translations live in the companion locale bond
 * `@molecule/app-locales-pricing-page`. The checkout transport lives in
 * `@molecule/app-billing-angular` (`usePricingTiers()` calls
 * `GET /api/billing/tiers`; `useStartCheckout()` posts to
 * `/api/billing/checkout`) — your API must serve those routes and the HTTP
 * client must be wired. NOTE: `@molecule/app-billing-angular` also exports
 * its own different pricing page (compound LimitsList/LimitsItem layout);
 * import from the package whose API you are using. The default checkout
 * redirects with `window.location.assign(checkoutUrl)` — pass `onCheckout`
 * to route through an SPA router or a non-Stripe flow. `<PlanUpdatedPage />`
 * here is the pricing-page-flavored success page; a standalone plan-updated
 * page lives in `@molecule/app-plan-updated-page-angular` — import the one
 * whose kit you are using.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { PlanUpdatedPage, PricingPage } from '@molecule/app-pricing-page-angular'
 *
 * @Component({
 *   selector: 'app-pricing',
 *   standalone: true,
 *   imports: [PlanUpdatedPage, PricingPage],
 *   template: `
 *     <section mol-pricing-page></section>
 *     <section mol-plan-updated-page planName="Pro" ctaHref="/dashboard" ctaLabel="Go to dashboard"></section>
 *   `,
 * })
 * export class PricingRoute {}
 * ```
 *
 * @remarks
 * - Inputs are React's prop names; the `renderLimits` render function is a
 *   template whose context carries the tier's limits as `$implicit` and
 *   `a0`, and the node-valued `ctaLabel` is projected content
 *   (`[slot=ctaLabel]`) or a string input.
 * - Each page's host IS the `<section>` React renders, so its class list and
 *   `data-mol-id` are host bindings.
 *
 * @module
 */

export * from './plan-updated-page.component.js'
export * from './pricing-page.component.js'
export * from './types.js'
