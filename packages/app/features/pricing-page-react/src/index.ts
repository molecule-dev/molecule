/**
 * Drop-in pricing page used by every paid molecule.dev flagship app.
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
 * Translations live in the companion locale bond
 * `@molecule/app-locales-pricing-page-react`. The Stripe checkout
 * transport lives in `@molecule/app-billing-react`.
 *
 * @example
 * ```tsx
 * import { PricingPage } from '@molecule/app-pricing-page-react'
 * import { addTranslations } from '@molecule/app-i18n'
 * import { en } from '@molecule/app-locales-pricing-page-react'
 *
 * addTranslations('en', en)
 *
 * const Pricing = () => <PricingPage />
 * ```
 *
 * @module
 */

export * from './PlanUpdatedPage.js'
export * from './PricingPage.js'
