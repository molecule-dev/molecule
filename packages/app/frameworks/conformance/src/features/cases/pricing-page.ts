/**
 * `@molecule/app-pricing-page-react` cases: the drop-in pricing page (tier
 * cards, monthly/yearly toggle, checkout handoff) and the post-checkout
 * success page.
 *
 * `<PricingPage />` reads the billing kit's resources (`usePricingTiers()`
 * always fires `GET /api/billing/tiers` on mount, even when an explicit
 * `tiers` prop is passed) and `useStartCheckout()` for the default checkout
 * transport, so every case mounts through the binding kit's full composition
 * (`composition: 'app'`): each case scripts the two `/api/billing/*` routes
 * through `context.http` and every request is recorded like a callback call.
 * A case that passes explicit `tiers` leaves the endpoint unscripted — the
 * fetch 404s and the page ignores it, exactly as React does.
 *
 * `<PlanUpdatedPage />` reads no service beyond i18n, but `composition` is
 * per package, so its cases run under the same composition.
 *
 * @module
 */

import type { BindingContext, HttpScript } from '../../bindings/spec.js'
import type { NodeSpec } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The free tier: no Stripe product, so its CTA is disabled. */
const freeTier = {
  key: 'free',
  name: 'Free',
  prices: [{ period: 'month', price: '$0', stripePriceId: null }],
  limits: { maxProjects: 3, canExport: false },
}

/** The middle tier, with both periods and a yearly savings tag. */
const proTier = {
  key: 'pro',
  name: 'Pro',
  prices: [
    { period: 'month', price: '$19/mo', stripePriceId: 'price_pro_m' },
    { period: 'year', price: '$190/yr', stripePriceId: 'price_pro_y', savings: '2 months free' },
  ],
  limits: { maxProjects: 100, canExport: true },
}

/** The highest tier; per-seat, so it carries the "per seat" tag. */
const teamTier = {
  key: 'team',
  name: 'Team',
  perSeat: true,
  prices: [
    { period: 'month', price: '$49/mo', stripePriceId: 'price_team_m' },
    { period: 'year', price: '$490/yr', stripePriceId: 'price_team_y', savings: '2 months free' },
  ],
  limits: { maxProjects: 1000, canExport: true },
}

/** A month-only tier: no `year` price, so it cannot turn the toggle on. */
const soloTier = {
  key: 'solo',
  name: 'Solo',
  prices: [{ period: 'month', price: '$9/mo', stripePriceId: 'price_solo_m' }],
  limits: { maxProjects: 10 },
}

/** A tier without any price: a dash in the price line and a disabled CTA. */
const pricelessTier = {
  key: 'priceless',
  name: 'Priceless',
  prices: [],
  limits: {},
}

/** What `GET /api/billing/tiers` answers. */
const tiersScript = (data: unknown): HttpScript => ({
  method: 'GET',
  url: '/api/billing/tiers',
  data: { data },
})

/** A scripted `POST /api/billing/checkout` answer. */
const checkoutScript = (data: unknown, status?: number): HttpScript => ({
  method: 'POST',
  url: '/api/billing/checkout',
  ...(status === undefined ? {} : { status }),
  data,
})

/** The tiers script plus the checkout script a click case needs. */
const withCheckout = (checkout: HttpScript): BindingContext => ({
  http: [tiersScript([freeTier, proTier, teamTier]), checkout],
})

/** `PricingPage`: the tier cards, the period toggle and the checkout flow. */
const pricingPage: FeatureCases['families'][number] = {
  component: 'PricingPage',
  cases: [
    {
      name: 'explicit tiers render one card per tier',
      props: { tiers: [freeTier, proTier, teamTier] },
    },
    {
      name: 'fetched tiers render one card per tier',
      context: { http: [tiersScript([freeTier, proTier, teamTier])] },
    },
    {
      name: 'a pending tiers load shows the loading line until it answers',
      context: { http: [{ method: 'GET', url: '/api/billing/tiers', defer: true }] },
      interactions: [
        { type: 'http', method: 'GET', url: '/api/billing/tiers', data: { data: [freeTier] } },
      ],
    },
    {
      name: 'a refused tiers endpoint shows the error line',
      context: { http: [{ method: 'GET', url: '/api/billing/tiers', status: 500, data: {} }] },
    },
    {
      name: 'an unreachable tiers endpoint shows the error line',
      context: {},
    },
    {
      name: 'fetched empty tiers render a heading over an empty grid',
      context: { http: [tiersScript([])] },
    },
    {
      name: 'showPeriodToggle false hides the toggle',
      props: { tiers: [freeTier, proTier, teamTier], showPeriodToggle: false },
    },
    {
      name: 'tiers without a yearly price hide the toggle',
      props: { tiers: [freeTier, soloTier] },
    },
    {
      name: 'defaultPeriod year selects the yearly prices and shows savings',
      props: { tiers: [freeTier, proTier, teamTier], defaultPeriod: 'year' },
    },
    {
      name: 'a defaultPeriod change after mount keeps the mounted period',
      props: { tiers: [freeTier, proTier, teamTier], defaultPeriod: 'month' },
      interactions: [{ type: 'props', props: { defaultPeriod: 'year' } }],
    },
    {
      name: 'the period toggle switches between monthly and yearly',
      props: { tiers: [freeTier, proTier, teamTier] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="pricing-page-period-year"]' },
        { type: 'click', selector: '[data-mol-id="pricing-page-period-month"]' },
      ],
    },
    {
      name: 'a custom renderLimits replaces the default rows',
      props: {
        tiers: [freeTier, proTier],
        renderLimits: { $fn: 'renderLimits', nodes: [customLimits()] },
      },
    },
    {
      name: 'a renderLimits swapped in on the same mount',
      props: {
        tiers: [proTier],
        renderLimits: { $fn: 'firstLimits', nodes: [{ tag: 'p', children: ['First'] }] },
      },
      interactions: [
        {
          type: 'props',
          props: {
            renderLimits: { $fn: 'secondLimits', nodes: [{ tag: 'p', children: ['Second'] }] },
          },
        },
      ],
    },
    {
      name: 'default limits render numbers, booleans, strings, objects and dashes',
      props: {
        tiers: [
          {
            key: 'pro',
            name: 'Pro',
            prices: [{ period: 'month', price: '$19/mo', stripePriceId: 'price_pro_m' }],
            limits: {
              maxAccounts: 3,
              maxTransactionsPerMonth: 12500,
              maxApiCalls: 999999,
              canExport: true,
              can_invite: false,
              supportTier: 'priority',
              extras: { audit: true },
              storage: null,
              maxProjects: 1000000,
            },
          },
        ],
      },
    },
    {
      name: 'a circular limits value falls back to its string form',
      context: { http: [tiersScript([{ ...freeTier, limits: circularLimits() }])] },
    },
    {
      name: 'string limits render no list',
      props: { tiers: [{ ...freeTier, limits: 'Unlimited everything' }] },
    },
    {
      name: 'null limits render no list',
      props: { tiers: [{ ...freeTier, limits: null }] },
    },
    {
      name: 'a tier without prices renders a dash and a disabled CTA',
      props: { tiers: [freeTier, pricelessTier] },
    },
    {
      name: 'a className reaches the section',
      props: { tiers: [freeTier], className: 'parity-token' },
    },
    {
      name: 'headingKey and headingDefault override the heading',
      props: {
        tiers: [freeTier],
        headingKey: 'app.plans.heading',
        headingDefault: 'Pick a plan',
      },
    },
    {
      name: 'the heading follows the locale bond and a locale switch',
      props: { tiers: [freeTier] },
      context: {
        translations: {
          en: { pricingPage: { heading: 'Choose your plan today' } },
          fr: { pricingPage: { heading: 'Choisissez votre forfait' } },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
    {
      name: 'onCheckout receives the clicked tier and its price',
      props: { tiers: [freeTier, proTier, teamTier], onCheckout: { $callback: 'onCheckout' } },
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-page-cta-pro"]' }],
    },
    {
      name: 'a tier without a stripe price never calls onCheckout',
      props: { tiers: [freeTier, proTier], onCheckout: { $callback: 'onCheckout' } },
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-page-cta-free"]' }],
    },
    {
      name: 'the default checkout posts the price id and hands the page to the provider',
      context: withCheckout(checkoutScript({ checkoutUrl: 'https://checkout.example.test/s/1' })),
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-page-cta-pro"]' }],
    },
    {
      name: 'an in-place subscription update reloads the page',
      context: withCheckout(checkoutScript({ updated: true })),
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-page-cta-pro"]' }],
    },
    {
      name: 'a failed checkout shows the page alert',
      context: withCheckout(checkoutScript({}, 500)),
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-page-cta-pro"]' }],
    },
    {
      name: 'a pending checkout disables the CTA until the provider answers',
      context: withCheckout({ method: 'POST', url: '/api/billing/checkout', defer: true }),
      interactions: [
        { type: 'click', selector: '[data-mol-id="pricing-page-cta-pro"]' },
        {
          type: 'http',
          method: 'POST',
          url: '/api/billing/checkout',
          data: { checkoutUrl: 'https://checkout.example.test/s/2' },
        },
      ],
    },
  ],
}

/** `PlanUpdatedPage`: the post-checkout success page. */
const planUpdatedPage: FeatureCases['families'][number] = {
  component: 'PlanUpdatedPage',
  cases: [
    { name: 'generic heading without a CTA' },
    { name: 'the plan name reaches the heading', props: { planName: 'Pro' } },
    { name: 'a className reaches the section', props: { className: 'parity-token' } },
    {
      name: 'a CTA button calls back on click',
      props: { ctaLabel: 'Continue to dashboard', onCta: { $callback: 'onCta' } },
      interactions: [{ type: 'click', selector: '[data-mol-id="plan-updated-cta"]' }],
    },
    {
      name: 'a CTA anchor follows its href and keeps a plain click',
      props: { ctaLabel: 'Go to dashboard', ctaHref: '/dashboard' },
      interactions: [{ type: 'click', selector: '[data-mol-id="plan-updated-cta"]' }],
    },
    {
      name: 'a node CTA label renders inside the anchor',
      props: { ctaHref: '/pro' },
      slots: { ctaLabel: [{ tag: 'strong', children: ['Go pro'] }] },
    },
    {
      name: 'a planName change updates the heading',
      props: { planName: 'Pro' },
      interactions: [{ type: 'props', props: { planName: 'Team' } }],
    },
    {
      name: 'a removed href swaps the anchor for the button',
      props: { ctaLabel: 'Continue', ctaHref: '/dashboard', onCta: { $callback: 'onCta' } },
      interactions: [
        { type: 'props', props: { ctaHref: null } },
        { type: 'click', selector: '[data-mol-id="plan-updated-cta"]' },
      ],
    },
    {
      name: 'the headings follow the locale bond and a locale switch',
      props: { planName: 'Pro' },
      context: {
        translations: {
          en: {
            pricingPage: {
              planUpdated: {
                headingNamed: 'You are now on the {{planName}} plan',
                body: 'Thanks for upgrading.',
              },
            },
          },
          fr: {
            pricingPage: {
              planUpdated: {
                headingNamed: 'Vous êtes maintenant sur le forfait {{planName}}',
                body: 'Merci pour la mise à niveau.',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}

/** `@molecule/app-pricing-page-react`. */
export const pricingPageFeature: FeatureCases = {
  package: '@molecule/app-pricing-page-react',
  composition: 'app',
  families: [planUpdatedPage, pricingPage],
}

/**
 * The limits object a case hands a tier: circular, so `JSON.stringify` throws
 * inside the default rows and the row shows `String(value)`.
 *
 * @returns A self-referencing limits object.
 */
function circularLimits(): Record<string, unknown> {
  const limits: Record<string, unknown> = { maxProjects: 3 }
  limits.self = limits
  return limits
}

/**
 * The node a custom `renderLimits` renders: a list holding the tier's own
 * numbers, so the render function's argument is visible in the DOM.
 *
 * @returns The node spec the render function returns.
 */
function customLimits(): NodeSpec {
  return {
    tag: 'ul',
    children: [
      { tag: 'li', children: ['Projects: {0.maxProjects}'] },
      { tag: 'li', children: ['Export: {0.canExport}'] },
    ],
  }
}
