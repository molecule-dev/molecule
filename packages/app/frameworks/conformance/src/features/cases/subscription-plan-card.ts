/**
 * `@molecule/app-subscription-plan-card-react` cases: the pricing / plan card
 * (badge, name, description, price + interval, feature checklist and the
 * primary CTA as a button or a link).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Node-valued plan name, for the slot-prop cases. */
const nameNode = [{ tag: 'strong', attrs: { 'data-node': 'name' }, children: ['Pro plan'] }]
/** Node-valued price, for the slot-prop cases. */
const priceNode = [{ tag: 'em', attrs: { 'data-node': 'price' }, children: ['$19'] }]
/** Node-valued description, for the slot-prop cases. */
const descriptionNode = [
  { tag: 'span', attrs: { 'data-node': 'description' }, children: ['For growing teams'] },
]
/** Node-valued interval, for the slot-prop cases. */
const intervalNode = [{ tag: 'span', attrs: { 'data-node': 'interval' }, children: ['/month'] }]
/** Node-valued CTA label, for the slot-prop cases. */
const ctaLabelNode = [{ tag: 'span', attrs: { 'data-node': 'cta' }, children: ['Get started'] }]
/** Node-valued badge, for the slot-prop cases. */
const badgeNode = [{ tag: 'span', attrs: { 'data-node': 'badge' }, children: ['Most popular'] }]
/** A node-valued entry inside the `features` list prop. */
const featureNode = {
  $nodes: [{ tag: 'strong', attrs: { 'data-node': 'feature' }, children: ['Unlimited projects'] }],
}

/** `@molecule/app-subscription-plan-card-react`. */
export const subscriptionPlanCardFeature: FeatureCases = {
  package: '@molecule/app-subscription-plan-card-react',
  families: [
    {
      component: 'SubscriptionPlanCard',
      cases: [
        {
          name: 'name, price and one feature',
          props: { name: 'Pro', price: '$19', features: ['Unlimited projects'] },
        },
        {
          name: 'description, interval and several features',
          props: {
            name: 'Team',
            description: 'For growing teams',
            price: '$49',
            interval: '/month',
            features: ['Unlimited projects', '10 GB storage', 'Priority support'],
          },
        },
        {
          name: 'node name, price, description and interval',
          props: { features: ['Unlimited projects'] },
          slots: {
            name: nameNode,
            price: priceNode,
            description: descriptionNode,
            interval: intervalNode,
          },
        },
        {
          name: 'recommended plan uses the default badge and primary CTA',
          props: {
            name: 'Pro',
            price: '$19',
            features: ['Unlimited projects'],
            ctaLabel: 'Choose Pro',
            recommended: true,
          },
          callbacks: ['onCta'],
        },
        {
          name: 'custom badge overrides the recommended default',
          props: {
            name: 'Pro',
            price: '$19',
            features: [],
            ctaLabel: 'Choose Pro',
            recommended: true,
            badge: 'Most popular',
          },
          callbacks: ['onCta'],
        },
        {
          name: 'badge without recommended',
          props: { name: 'Pro', price: '$19', features: [], badge: 'Best value' },
        },
        {
          name: 'recommended with an empty badge shows the default badge',
          props: { name: 'Pro', price: '$19', features: [], recommended: true, badge: '' },
        },
        {
          name: 'node badge and CTA label',
          props: {
            name: 'Enterprise',
            price: 'Custom',
            features: ['Dedicated support'],
            ctaHref: '/contact',
            recommended: true,
          },
          slots: { badge: badgeNode, ctaLabel: ctaLabelNode },
        },
        {
          name: 'the CTA button calls onCta',
          props: { name: 'Pro', price: '$19', features: [], ctaLabel: 'Choose Pro' },
          callbacks: ['onCta'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'the CTA link renders an anchor',
          props: {
            name: 'Pro',
            price: '$19',
            features: [],
            ctaLabel: 'Choose Pro',
            ctaHref: '/checkout/pro',
          },
        },
        {
          name: 'a recommended CTA link keeps the primary color',
          props: {
            name: 'Pro',
            price: '$19',
            features: [],
            ctaLabel: 'Choose Pro',
            ctaHref: '/checkout/pro',
            recommended: true,
          },
        },
        {
          name: 'no CTA without a label',
          props: { name: 'Pro', price: '$19', features: [] },
          callbacks: ['onCta'],
        },
        {
          name: 'an empty CTA label hides the CTA',
          props: { name: 'Pro', price: '$19', features: [], ctaLabel: '' },
          callbacks: ['onCta'],
        },
        {
          name: 'an empty ctaHref renders a button',
          props: { name: 'Pro', price: '$19', features: [], ctaLabel: 'Choose Pro', ctaHref: '' },
          callbacks: ['onCta'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'empty description and interval are omitted',
          props: { name: 'Pro', price: '$19', features: [], description: '', interval: '' },
        },
        {
          name: 'className and the recommended outline',
          props: {
            name: 'Pro',
            price: '$19',
            features: [],
            className: 'parity-plan',
            recommended: true,
          },
        },
        {
          name: 'a node item inside the feature list',
          props: {
            name: 'Pro',
            price: '$19',
            features: ['Plain feature', featureNode],
          },
        },
        {
          name: 'name, price and description change',
          props: {
            name: 'Pro',
            description: 'For individuals',
            price: '$19',
            features: ['One project'],
          },
          interactions: [
            {
              type: 'props',
              props: { name: 'Team', description: 'For growing teams', price: '$49' },
            },
          ],
        },
        {
          name: 'recommended turns on',
          props: {
            name: 'Pro',
            price: '$19',
            features: ['Unlimited projects'],
            ctaLabel: 'Choose Pro',
          },
          callbacks: ['onCta'],
          interactions: [{ type: 'props', props: { recommended: true } }],
        },
        {
          name: 'recommended turns off',
          props: {
            name: 'Pro',
            price: '$19',
            features: ['Unlimited projects'],
            ctaLabel: 'Choose Pro',
            recommended: true,
          },
          callbacks: ['onCta'],
          interactions: [{ type: 'props', props: { recommended: false } }],
        },
        {
          name: 'the badge appears and is removed',
          props: { name: 'Pro', price: '$19', features: [] },
          interactions: [
            { type: 'props', props: { badge: 'Most popular' } },
            { type: 'props', props: { badge: null } },
          ],
        },
        {
          name: 'the interval appears on change',
          props: { name: 'Pro', price: '$19', features: [] },
          interactions: [{ type: 'props', props: { interval: '/yr' } }],
        },
        {
          name: 'the CTA switches from a button to a link',
          props: { name: 'Pro', price: '$19', features: [], ctaLabel: 'Choose Pro' },
          callbacks: ['onCta'],
          interactions: [{ type: 'props', props: { ctaHref: '/checkout/pro' } }],
        },
        {
          name: 'the feature list grows',
          props: { name: 'Pro', price: '$19', features: ['One project'] },
          interactions: [{ type: 'props', props: { features: ['One project', '10 GB storage'] } }],
        },
      ],
    },
  ],
}
