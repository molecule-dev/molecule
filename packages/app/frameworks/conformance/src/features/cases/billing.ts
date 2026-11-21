/**
 * `@molecule/app-billing-react` cases: the public pricing page, the account
 * status badge, the two limits building blocks, and the four `/api/billing/*`
 * hooks.
 *
 * Every case mounts through the binding kit's full composition
 * (`composition: 'app'`): the page reads auth and both HTTP resources, and the
 * badge reads the status resource plus the cancel action, so each case scripts
 * `/api/billing/tiers`, `/api/billing/status`, `/api/billing/checkout` and
 * `/api/billing/cancel` through `context.http` and every request is recorded
 * like a callback call.
 *
 * The two limits components (`LimitsList`, `LimitsItem`) read no service; they
 * run under the same composition because `composition` is per package.
 *
 * The four hooks run as hook cases through each framework's binding adapter,
 * so the page's and the badge's data layer is held to React's snapshots on its
 * own as well as through the rendered DOM.
 *
 * @module
 */

import type { BindingContext, HookCases, HttpScript } from '../../bindings/spec.js'
import type { CaseA11y, NodeSpec } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case mounts one list row on its own, outside the `<ul>` its list component provides. */
const BARE_ROW: CaseA11y = {
  expect: ['listitem'],
  reason: 'The case mounts a single row on its own, outside the <ul> of its list component',
}

/** The free tier: no Stripe product, so its CTA is disabled. */
const freeTier = {
  key: 'free',
  name: 'Free',
  prices: [{ period: 'month', price: '$0', stripePriceId: null }],
  limits: { maxProjects: 3, canExport: false },
}

/** The middle tier, the auto-selected "most popular" one for three tiers. */
const proTier = {
  key: 'pro',
  name: 'Pro',
  prices: [
    { period: 'month', price: '$19/mo', stripePriceId: 'price_pro_m' },
    { period: 'year', price: '$190/yr', stripePriceId: 'price_pro_y', savings: '2 months free' },
  ],
  limits: { maxProjects: 100, canExport: true },
}

/** The highest-priced tier; per-seat, so it carries the "per seat" tag. */
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

/** What `GET /api/billing/tiers` answers: free → pro → team. */
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

/** The signed-in context the page runs with. */
const authed: BindingContext = {
  auth: { status: 'authenticated', user: { id: 'u1', name: 'Ada Lovelace' } },
}

/** The anonymous context an upgrade click from the marketing page runs with. */
const anonymous: BindingContext = { auth: { status: 'unauthenticated' } }

/** `PricingPage`: the table, its three column variants, and the upgrade flow. */
const pricingPage: FeatureCases['families'][number] = {
  component: 'PricingPage',
  cases: [
    {
      name: 'three tiers, the dearest paid one centred and highlighted',
      context: { ...authed, http: [tiersScript([freeTier, proTier, teamTier])] },
    },
    {
      name: 'yearly period with savings tags',
      props: { period: 'year' },
      context: { ...authed, http: [tiersScript([freeTier, proTier, teamTier])] },
    },
    {
      name: 'two tiers leave the server order alone',
      context: { ...authed, http: [tiersScript([freeTier, proTier])] },
    },
    {
      name: 'a tier without prices renders a dash and a disabled current-plan CTA',
      context: {
        ...authed,
        http: [tiersScript([{ key: 'free', name: 'Free', prices: [], limits: {} }])],
      },
    },
    {
      name: 'a tier missing the requested period falls back to its first price',
      props: { period: 'month' },
      context: {
        ...authed,
        http: [
          tiersScript([
            {
              key: 'annual',
              name: 'Annual',
              prices: [{ period: 'year', price: '$99/yr', stripePriceId: 'price_annual' }],
              limits: { maxProjects: 10 },
            },
          ]),
        ],
      },
    },
    {
      name: 'default limits render numbers, booleans, strings, objects and a dash',
      context: {
        ...authed,
        http: [
          tiersScript([
            {
              key: 'pro',
              name: 'Pro',
              prices: [{ period: 'month', price: '$19/mo', stripePriceId: 'price_pro_m' }],
              limits: {
                maxAccounts: 3,
                maxTransactionsPerMonth: 12500,
                canExport: true,
                can_invite: false,
                supportTier: 'priority',
                extras: { audit: true },
                storage: null,
                maxProjects: 1000000,
              },
            },
          ]),
        ],
      },
    },
    {
      name: 'non-object limits render an empty list',
      context: {
        ...authed,
        http: [tiersScript([{ key: 'free', name: 'Free', prices: [], limits: null }])],
      },
    },
    {
      name: 'unserialisable limits fall back to their string form',
      props: {
        // A circular limits object: JSON.stringify throws and the row shows String(value).
        period: 'month',
      },
      context: {
        ...authed,
        http: [tiersScript([{ key: 'free', name: 'Free', prices: [], limits: circularLimits() }])],
      },
    },
    {
      name: 'a custom renderLimits replaces the default rows',
      props: { renderLimits: { $fn: 'renderLimits', nodes: [customLimits()] } },
      context: { ...authed, http: [tiersScript([freeTier, proTier])] },
    },
    {
      name: 'a heading override reaches the heading',
      props: {
        headingKey: 'billing.custom.heading',
        headingDefault: 'Our plans',
        subheadingKey: 'billing.custom.subheading',
        subheadingDefault: 'Pick one.',
      },
      context: { ...authed, http: [tiersScript([freeTier])] },
    },
    {
      name: 'a null subheading key suppresses the subheading',
      props: { subheadingKey: null },
      context: { ...authed, http: [tiersScript([freeTier])] },
    },
    {
      name: 'a className and a custom headline font reach the page',
      props: { className: 'parity-token', headlineFontFamily: 'Georgia, serif' },
      context: { ...authed, http: [tiersScript([freeTier, proTier, teamTier])] },
    },
    {
      name: 'a null headline font inherits the theme font',
      props: { headlineFontFamily: null },
      context: { ...authed, http: [tiersScript([freeTier, proTier])] },
    },
    {
      name: 'an explicit popularTierKey moves that tier to the centre',
      props: { popularTierKey: 'pro' },
      context: { ...authed, http: [tiersScript([freeTier, proTier, teamTier])] },
    },
    {
      name: 'a null popularTierKey highlights nothing',
      props: { popularTierKey: null },
      context: { ...authed, http: [tiersScript([freeTier, proTier, teamTier])] },
    },
    {
      name: 'a popularTierKey naming no tier leaves the order alone',
      props: { popularTierKey: 'enterprise' },
      context: { ...authed, http: [tiersScript([freeTier, proTier, teamTier])] },
    },
    {
      name: 'a pending tiers load shows the loading line until it answers',
      context: {
        ...authed,
        http: [{ method: 'GET', url: '/api/billing/tiers', defer: true }],
      },
      interactions: [
        { type: 'http', method: 'GET', url: '/api/billing/tiers', data: { data: [freeTier] } },
      ],
    },
    {
      name: 'an unreachable tiers endpoint shows the error line',
      context: authed,
    },
    {
      name: 'a refused tiers endpoint shows the error line',
      context: {
        ...authed,
        http: [{ method: 'GET', url: '/api/billing/tiers', status: 500, data: {} }],
      },
    },
    {
      name: 'changes the period on the same mount',
      props: { period: 'month' },
      context: { ...authed, http: [tiersScript([freeTier, proTier, teamTier])] },
      interactions: [{ type: 'props', props: { period: 'year' } }],
    },
    {
      name: 'a custom renderLimits swapped in on the same mount',
      props: { renderLimits: { $fn: 'firstLimits', nodes: [{ tag: 'p', children: ['First'] }] } },
      context: { ...authed, http: [tiersScript([proTier])] },
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
      name: 'upgrading posts the price id and a failed checkout shows the alert',
      context: {
        ...authed,
        http: [tiersScript([freeTier, proTier]), checkoutScript({}, 500)],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-cta-pro"]' }],
    },
    {
      name: 'a failed checkout from an anonymous visitor stays put without a redirect',
      props: { unauthenticatedRedirect: null },
      context: {
        ...anonymous,
        http: [tiersScript([freeTier, proTier]), checkoutScript({}, 500)],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-cta-pro"]' }],
    },
    {
      name: 'a failed checkout sends an anonymous visitor to /login',
      context: {
        ...anonymous,
        http: [tiersScript([freeTier, proTier]), checkoutScript({}, 500)],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-cta-pro"]' }],
    },
    {
      name: 'a failed checkout sends an anonymous visitor to a custom path',
      props: { unauthenticatedRedirect: '/signup' },
      context: {
        ...anonymous,
        http: [tiersScript([freeTier, proTier]), checkoutScript({}, 500)],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-cta-pro"]' }],
    },
    {
      name: 'a checkout url hands the page to the provider',
      context: {
        ...authed,
        http: [
          tiersScript([freeTier, proTier]),
          checkoutScript({ checkoutUrl: 'https://checkout.example.test/s/1' }),
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-cta-pro"]' }],
    },
    {
      name: 'an in-place subscription update reloads the page',
      context: {
        ...authed,
        http: [tiersScript([freeTier, proTier]), checkoutScript({ updated: true })],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-cta-pro"]' }],
    },
    {
      name: 'the free tier CTA is disabled and posts nothing',
      context: { ...authed, http: [tiersScript([freeTier, proTier])] },
      interactions: [{ type: 'click', selector: '[data-mol-id="pricing-cta-free"]' }],
    },
  ],
}

/** `BillingStatusBadge`: the loading line, both plan states, and the cancel flow. */
const statusBadge: FeatureCases['families'][number] = {
  component: 'BillingStatusBadge',
  cases: [
    {
      name: 'a paid plan offers cancel and cancelling calls back',
      callbacks: ['onCanceled'],
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { planKey: 'stripeMonthly', category: 'pro', name: 'Pro', isFree: false },
          },
          { method: 'POST', url: '/api/billing/cancel', data: { canceled: true } },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="billing-cancel-button"]' }],
    },
    {
      name: 'a free plan hides the cancel button',
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { planKey: 'free', category: 'free', name: 'Free', isFree: true },
          },
        ],
      },
    },
    {
      name: 'showCancel false hides the cancel button on a paid plan',
      props: { showCancel: false },
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { planKey: 'stripeMonthly', category: 'pro', name: 'Pro', isFree: false },
          },
        ],
      },
    },
    {
      name: 'a className reaches the badge wrapper',
      props: { className: 'parity-token' },
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { planKey: 'free', category: 'free', name: 'Free', isFree: true },
          },
        ],
      },
    },
    {
      name: 'a pending status read shows the loading line until it answers',
      context: {
        ...authed,
        http: [{ method: 'GET', url: '/api/billing/status', defer: true }],
      },
      interactions: [
        {
          type: 'http',
          method: 'GET',
          url: '/api/billing/status',
          data: { planKey: 'free', category: 'free', name: 'Free', isFree: true },
        },
      ],
    },
    {
      name: 'an unauthenticated status read renders nothing',
      context: { ...anonymous },
    },
    {
      name: 'a pending cancel keeps the button disabled until it answers',
      callbacks: ['onCanceled'],
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { planKey: 'stripeMonthly', category: 'pro', name: 'Pro', isFree: false },
          },
          { method: 'POST', url: '/api/billing/cancel', defer: true },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="billing-cancel-button"]' },
        { type: 'http', method: 'POST', url: '/api/billing/cancel', data: { canceled: true } },
      ],
    },
    {
      name: 'a refused cancel shows the alert and does not call back',
      callbacks: ['onCanceled'],
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { planKey: 'stripeMonthly', category: 'pro', name: 'Pro', isFree: false },
          },
          { method: 'POST', url: '/api/billing/cancel', status: 500, data: {} },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="billing-cancel-button"]' }],
    },
    {
      name: 'a cancel the provider did not confirm does not call back',
      callbacks: ['onCanceled'],
      context: {
        ...authed,
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { planKey: 'stripeMonthly', category: 'pro', name: 'Pro', isFree: false },
          },
          { method: 'POST', url: '/api/billing/cancel', data: { canceled: false } },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="billing-cancel-button"]' }],
    },
  ],
}

/** `LimitsList`: the stacked checklist container. */
const limitsList: FeatureCases['families'][number] = {
  component: 'LimitsList',
  cases: [
    {
      name: 'holds its rows',
      children: [
        { component: 'LimitsItem', children: ['3 projects'] },
        { component: 'LimitsItem', props: { included: false }, children: ['Data export'] },
      ],
      context: authed,
    },
    { name: 'renders empty', children: [], context: authed },
  ],
}

/** `LimitsItem`: one row, with and without the included mark. */
const limitsItem: FeatureCases['families'][number] = {
  component: 'LimitsItem',
  cases: [
    { name: 'included by default', a11y: BARE_ROW, children: ['3 projects'], context: authed },
    {
      name: 'explicitly included',
      a11y: BARE_ROW,
      props: { included: true },
      children: ['3 projects'],
      context: authed,
    },
    {
      name: 'excluded renders the dash glyph',
      a11y: BARE_ROW,
      props: { included: false },
      children: ['Data export'],
      context: authed,
    },
  ],
}

/**
 * The limits object a case hands a tier: circular, so `JSON.stringify` throws
 * inside the default rows and each row shows `String(value)`.
 *
 * @returns A self-referencing limits object.
 */
function circularLimits(): Record<string, unknown> {
  const limits: Record<string, unknown> = { maxProjects: 3 }
  limits.self = limits
  return limits
}

/**
 * The node a custom `renderLimits` renders: a stack holding the tier's own
 * numbers, so the render function's argument is visible in the DOM.
 *
 * @returns The node spec the render function returns.
 */
function customLimits(): NodeSpec {
  return {
    component: 'LimitsList',
    children: [
      { component: 'LimitsItem', children: ['Accounts: {0.maxProjects}'] },
      { component: 'LimitsItem', props: { included: false }, children: ['Export: {0.canExport}'] },
    ],
  }
}

/** `usePricingTiers`: the public tier list. */
const usePricingTiers: HookCases = {
  hook: 'usePricingTiers',
  cases: [
    {
      name: 'loads the tier list on mount',
      context: { http: [tiersScript([freeTier, proTier])] },
    },
    {
      name: 'a pending load stays loading until it answers',
      context: { http: [{ method: 'GET', url: '/api/billing/tiers', defer: true }] },
      steps: [
        { type: 'http', method: 'GET', url: '/api/billing/tiers', data: { data: [freeTier] } },
      ],
    },
    {
      name: 'a refused load records the error',
      context: { http: [{ method: 'GET', url: '/api/billing/tiers', status: 500, data: {} }] },
    },
    {
      name: 'execute refetches the list',
      context: { http: [tiersScript([freeTier]), tiersScript([freeTier, proTier])] },
      steps: [{ type: 'call', method: 'execute', as: 'again' }],
    },
    {
      name: 'reset clears the loaded list',
      context: { http: [tiersScript([freeTier])] },
      steps: [{ type: 'call', method: 'reset' }],
    },
  ],
}

/** `useBillingStatus`: the signed-in user's subscription snapshot. */
const useBillingStatus: HookCases = {
  hook: 'useBillingStatus',
  cases: [
    {
      name: 'loads the status on mount',
      context: {
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { planKey: 'stripeMonthly', category: 'pro', name: 'Pro', isFree: false },
          },
        ],
      },
    },
    {
      name: 'an unauthenticated read records the error',
      context: {},
    },
    {
      name: 'reset clears the loaded status',
      context: {
        http: [
          {
            method: 'GET',
            url: '/api/billing/status',
            data: { planKey: 'free', category: 'free', name: 'Free', isFree: true },
          },
        ],
      },
      steps: [{ type: 'call', method: 'reset' }],
    },
  ],
}

/** `useStartCheckout`: the checkout action and its async state. */
const useStartCheckout: HookCases = {
  hook: 'useStartCheckout',
  cases: [
    {
      name: 'starts idle',
      context: {},
    },
    {
      name: 'start posts the price id and records the response',
      context: { http: [checkoutScript({ checkoutUrl: 'https://checkout.example.test/s/1' })] },
      steps: [{ type: 'call', method: 'start', args: ['price_pro_m'], as: 'checkout' }],
    },
    {
      name: 'a failed start records the error and resolves null',
      context: { http: [checkoutScript({}, 500)] },
      steps: [{ type: 'call', method: 'start', args: ['price_pro_m'] }],
    },
    {
      name: 'a pending start shows loading until the checkout answers',
      context: { http: [{ method: 'POST', url: '/api/billing/checkout', defer: true }] },
      steps: [
        { type: 'call', method: 'start', args: ['price_pro_m'] },
        {
          type: 'http',
          method: 'POST',
          url: '/api/billing/checkout',
          data: { updated: true },
        },
      ],
    },
  ],
}

/** `useCancelSubscription`: the cancel action and its async state. */
const useCancelSubscription: HookCases = {
  hook: 'useCancelSubscription',
  cases: [
    {
      name: 'starts idle',
      context: {},
    },
    {
      name: 'cancel posts and records the response',
      context: { http: [{ method: 'POST', url: '/api/billing/cancel', data: { canceled: true } }] },
      steps: [{ type: 'call', method: 'cancel', as: 'canceled' }],
    },
    {
      name: 'a failed cancel records the error and resolves null',
      context: { http: [{ method: 'POST', url: '/api/billing/cancel', status: 500, data: {} }] },
      steps: [{ type: 'call', method: 'cancel' }],
    },
    {
      name: 'a pending cancel shows loading until the provider answers',
      context: { http: [{ method: 'POST', url: '/api/billing/cancel', defer: true }] },
      steps: [
        { type: 'call', method: 'cancel' },
        { type: 'http', method: 'POST', url: '/api/billing/cancel', data: { canceled: true } },
      ],
    },
  ],
}

/** `@molecule/app-billing-react`. */
export const billingFeature: FeatureCases = {
  package: '@molecule/app-billing-react',
  composition: 'app',
  families: [limitsItem, limitsList, pricingPage, statusBadge],
  hooks: [useBillingStatus, useCancelSubscription, usePricingTiers, useStartCheckout],
}
