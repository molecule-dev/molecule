/**
 * `@molecule/app-loyalty-tier-badge-react` cases: the tier badge's four tiers,
 * the three sizes, the progress bar toward the next tier (and every branch that
 * hides it), the label overrides, the node-free markup treatment, the
 * `computeProgress` / `nextTierOf` helpers, and the text a locale switch
 * replaces.
 *
 * The badge has no callback props and no node props: every branch is chosen by
 * props alone, so the interactions below change props and the bonded locale,
 * not clicks.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** French copy for every key the badge reads (the companion bond's fr table). */
const FRENCH = {
  loyaltyTierBadge: {
    tier: { bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine' },
    group: 'niveau {{tier}}',
    progress: 'Progression vers {{next}}',
    remaining: '{{remaining}} pour {{next}}',
    topTier: 'Sommet atteint',
  },
}

/** `@molecule/app-loyalty-tier-badge-react`. */
export const loyaltyTierBadgeFeature: FeatureCases = {
  package: '@molecule/app-loyalty-tier-badge-react',
  families: [
    {
      component: 'LoyaltyTierBadge',
      cases: [
        { name: 'bronze by default', props: { tier: 'bronze' } },
        { name: 'silver', props: { tier: 'silver' } },
        { name: 'gold', props: { tier: 'gold' } },
        { name: 'platinum shows the top tier message', props: { tier: 'platinum' } },
        { name: 'small size', props: { tier: 'silver', size: 'sm' } },
        { name: 'large size', props: { tier: 'gold', size: 'lg' } },
        {
          name: 'progress toward the next tier',
          props: { tier: 'silver', points: 300, nextTierThreshold: 1000 },
        },
        {
          name: 'progress at zero',
          props: { tier: 'bronze', points: 0, nextTierThreshold: 500 },
        },
        {
          name: 'progress at the threshold',
          props: { tier: 'silver', points: 1000, nextTierThreshold: 1000 },
        },
        {
          name: 'progress over the threshold clamps',
          props: { tier: 'gold', points: 5000, nextTierThreshold: 1000 },
        },
        {
          name: 'negative points clamp to zero',
          props: { tier: 'bronze', points: -50, nextTierThreshold: 100 },
        },
        {
          name: 'a zero threshold hides the progress bar',
          props: { tier: 'silver', points: 50, nextTierThreshold: 0 },
        },
        {
          name: 'a negative threshold hides the progress bar',
          props: { tier: 'silver', points: 50, nextTierThreshold: -5 },
        },
        {
          name: 'points without a threshold hide the progress bar',
          props: { tier: 'silver', points: 500 },
        },
        {
          name: 'a threshold without points hides the progress bar',
          props: { tier: 'silver', nextTierThreshold: 1000 },
        },
        {
          name: 'platinum ignores points and threshold',
          props: { tier: 'platinum', points: 5000, nextTierThreshold: 10000 },
        },
        { name: 'a custom tier label', props: { tier: 'gold', tierLabel: 'VIP' } },
        {
          name: 'a custom next tier label',
          props: {
            tier: 'gold',
            points: 50000,
            nextTierThreshold: 100000,
            nextTierLabel: 'Diamond',
          },
        },
        {
          name: 'custom labels together',
          props: {
            tier: 'bronze',
            tierLabel: 'Member',
            points: 250,
            nextTierThreshold: 1000,
            nextTierLabel: 'Elite',
          },
        },
        {
          name: 'dataMolId and className passthrough',
          props: {
            tier: 'gold',
            dataMolId: 'account-tier',
            className: 'parity-token',
          },
        },
        {
          name: 'the tier changes',
          props: { tier: 'bronze' },
          interactions: [{ type: 'props', props: { tier: 'gold' } }],
        },
        {
          name: 'the size changes',
          props: { tier: 'gold', size: 'sm' },
          interactions: [{ type: 'props', props: { size: 'lg' } }],
        },
        {
          name: 'progress advances',
          props: { tier: 'silver', points: 300, nextTierThreshold: 1000 },
          interactions: [{ type: 'props', props: { points: 600 } }],
        },
        {
          name: 'progress is hidden again',
          props: { tier: 'silver', points: 300, nextTierThreshold: 1000 },
          interactions: [{ type: 'props', props: { nextTierThreshold: 0 } }],
        },
        {
          name: 'the tier becomes platinum',
          props: { tier: 'gold', points: 300, nextTierThreshold: 1000 },
          interactions: [{ type: 'props', props: { tier: 'platinum' } }],
        },
        {
          name: 'dataMolId changes',
          props: { tier: 'gold', dataMolId: 'first-id' },
          interactions: [{ type: 'props', props: { dataMolId: 'second-id' } }],
        },
        {
          name: 'className changes',
          props: { tier: 'gold', className: 'first-token' },
          interactions: [{ type: 'props', props: { className: 'parity-token' } }],
        },
        {
          name: 'the labels follow a locale switch',
          props: { tier: 'gold', points: 500, nextTierThreshold: 1000 },
          context: { translations: { fr: FRENCH } },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
        {
          name: 'the top tier message follows a locale switch',
          props: { tier: 'platinum' },
          context: { translations: { fr: FRENCH } },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'computeProgress',
      calls: [
        // No usable pair.
        [],
        [100],
        [undefined, 1000],
        // Clamping.
        [-5, 100],
        [0, 1000],
        [50, 100],
        [150, 100],
        [1000, 1000],
        // Zero and negative thresholds are protected.
        [50, 0],
        [50, -5],
        // A fractional ratio.
        [1, 3],
      ],
    },
    {
      export: 'nextTierOf',
      calls: [['bronze'], ['silver'], ['gold'], ['platinum']],
    },
  ],
}
