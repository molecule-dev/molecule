/**
 * `@molecule/app-pricing-table-react` cases: the features × plans pricing
 * comparison table — plan header cards (name, description, price, interval,
 * recommended outline, button or link CTA), then one row per feature with its
 * per-plan value (`true` → ✓, `false` → —, strings and nodes passed through),
 * the optional group heading above a row, className passthrough, and the
 * prop-change branches (a plan or description appearing, the outline and CTA
 * changing, feature values changing).
 *
 * Every string arrives through props, so there is no translation key here.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Node-valued plan name, for the node-prop cases. */
const nameNode = [{ tag: 'strong', attrs: { 'data-node': 'name' }, children: ['Pro plan'] }]
/** Node-valued plan description. */
const descriptionNode = [
  { tag: 'span', attrs: { 'data-node': 'description' }, children: ['For growing teams'] },
]
/** Node-valued price. */
const priceNode = [{ tag: 'em', attrs: { 'data-node': 'price' }, children: ['$19'] }]
/** Node-valued interval. */
const intervalNode = [{ tag: 'span', attrs: { 'data-node': 'interval' }, children: ['/month'] }]
/** Node-valued CTA label. */
const ctaLabelNode = [{ tag: 'span', attrs: { 'data-node': 'cta' }, children: ['Get started'] }]
/** Node-valued feature label. */
const labelNode = [{ tag: 'strong', attrs: { 'data-node': 'label' }, children: ['Projects'] }]
/** Node-valued group heading. */
const groupHeadingNode = [
  { tag: 'em', attrs: { 'data-node': 'group' }, children: ['Developer tools'] },
]
/** A node-valued entry inside one feature's `values` record. */
const valueNode = {
  $nodes: [{ tag: 'strong', attrs: { 'data-node': 'value' }, children: ['Unlimited'] }],
}

/** `@molecule/app-pricing-table-react`. */
export const pricingTableFeature: FeatureCases = {
  package: '@molecule/app-pricing-table-react',
  families: [
    {
      component: 'PricingTable',
      cases: [
        {
          name: 'a single plan with a name and a price',
          props: {
            plans: [{ id: 'free', name: 'Free', price: '$0' }],
            features: [],
          },
        },
        {
          name: 'two plans with descriptions and intervals',
          props: {
            plans: [
              {
                id: 'free',
                name: 'Free',
                description: 'For individuals',
                price: '$0',
                interval: '/mo',
              },
              {
                id: 'pro',
                name: 'Pro',
                description: 'For growing teams',
                price: '$12',
                interval: '/mo',
              },
            ],
            features: [],
          },
        },
        {
          name: 'string feature values across two plans',
          props: {
            plans: [
              { id: 'free', name: 'Free', price: '$0' },
              { id: 'pro', name: 'Pro', price: '$12' },
            ],
            features: [
              { label: 'Projects', values: { free: '3', pro: 'Unlimited' } },
              { label: 'Storage', values: { free: '1 GB', pro: '100 GB' } },
            ],
          },
        },
        {
          name: 'boolean feature values across two plans',
          props: {
            plans: [
              { id: 'free', name: 'Free', price: '$0' },
              { id: 'pro', name: 'Pro', price: '$12' },
            ],
            features: [
              { label: 'Projects', values: { free: '3', pro: 'Unlimited' } },
              { label: 'API access', values: { free: false, pro: true } },
            ],
          },
        },
        {
          name: 'a node feature value passes through',
          props: {
            plans: [{ id: 'pro', name: 'Pro', price: '$12' }],
            features: [{ label: 'Projects', values: { pro: valueNode } }],
          },
        },
        {
          name: 'a group heading spans every column',
          props: {
            plans: [
              { id: 'free', name: 'Free', price: '$0' },
              { id: 'pro', name: 'Pro', price: '$12' },
            ],
            features: [
              {
                label: 'API access',
                values: { free: false, pro: true },
                groupHeading: 'Developer',
              },
              { label: 'Priority support', values: { free: false, pro: true } },
            ],
          },
        },
        {
          name: 'a feature with no value for a plan renders an empty cell',
          props: {
            plans: [
              { id: 'free', name: 'Free', price: '$0' },
              { id: 'pro', name: 'Pro', price: '$12' },
            ],
            features: [{ label: 'Projects', values: { free: '3' } }],
          },
        },
        {
          name: 'an empty string feature value renders nothing',
          props: {
            plans: [{ id: 'free', name: 'Free', price: '$0' }],
            features: [{ label: 'Projects', values: { free: '' } }],
          },
        },
        {
          name: 'a recommended plan with a button CTA',
          props: {
            plans: [
              {
                id: 'pro',
                name: 'Pro',
                price: '$12',
                interval: '/mo',
                recommended: true,
                cta: { label: 'Upgrade', onClick: { $callback: 'onCta' } },
              },
            ],
            features: [{ label: 'Projects', values: { pro: 'Unlimited' } }],
          },
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'a link CTA renders an anchor around the button',
          props: {
            plans: [
              {
                id: 'pro',
                name: 'Pro',
                price: '$12',
                cta: { label: 'Upgrade', href: '/checkout/pro' },
              },
            ],
            features: [],
          },
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'a CTA with both an href and a handler keeps the handler unused',
          props: {
            plans: [
              {
                id: 'pro',
                name: 'Pro',
                price: '$12',
                cta: { label: 'Upgrade', href: '/checkout', onClick: { $callback: 'onCta' } },
              },
            ],
            features: [],
          },
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'empty description, interval and group heading are omitted',
          props: {
            plans: [{ id: 'free', name: 'Free', price: '$0', description: '', interval: '' }],
            features: [{ label: 'Projects', values: { free: '3' }, groupHeading: '' }],
          },
        },
        {
          name: 'node plan fields, feature label and group heading',
          props: {
            plans: [
              {
                id: 'pro',
                name: { $nodes: nameNode },
                description: { $nodes: descriptionNode },
                price: { $nodes: priceNode },
                interval: { $nodes: intervalNode },
                cta: { label: { $nodes: ctaLabelNode } },
              },
            ],
            features: [
              {
                label: { $nodes: labelNode },
                values: { pro: 'Unlimited' },
                groupHeading: { $nodes: groupHeadingNode },
              },
            ],
          },
        },
        {
          name: 'className is forwarded to the wrapper',
          props: {
            plans: [{ id: 'free', name: 'Free', price: '$0' }],
            features: [{ label: 'Projects', values: { free: '3' } }],
            className: 'parity-pricing-table',
          },
        },
        {
          name: 'no plans still renders the feature rows',
          props: {
            plans: [],
            features: [
              { label: 'Projects', values: {} },
              { label: 'Storage', values: {} },
            ],
          },
        },
        {
          name: 'the second plan is added',
          props: {
            plans: [{ id: 'free', name: 'Free', price: '$0' }],
            features: [
              { label: 'Projects', values: { free: '3', pro: 'Unlimited' }, groupHeading: 'Core' },
            ],
          },
          interactions: [
            {
              type: 'props',
              props: {
                plans: [
                  { id: 'free', name: 'Free', price: '$0' },
                  { id: 'pro', name: 'Pro', price: '$12' },
                ],
              },
            },
          ],
        },
        {
          name: 'a description and an interval appear',
          props: {
            plans: [{ id: 'free', name: 'Free', price: '$0' }],
            features: [],
          },
          interactions: [
            {
              type: 'props',
              props: {
                plans: [
                  {
                    id: 'free',
                    name: 'Free',
                    description: 'For individuals',
                    price: '$0',
                    interval: '/mo',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'the recommended outline appears and disappears',
          props: {
            plans: [{ id: 'pro', name: 'Pro', price: '$12' }],
            features: [],
          },
          interactions: [
            {
              type: 'props',
              props: { plans: [{ id: 'pro', name: 'Pro', price: '$12', recommended: true }] },
            },
            {
              type: 'props',
              props: { plans: [{ id: 'pro', name: 'Pro', price: '$12', recommended: false }] },
            },
          ],
        },
        {
          name: 'the CTA switches from a button to a link',
          props: {
            plans: [
              {
                id: 'pro',
                name: 'Pro',
                price: '$12',
                cta: { label: 'Upgrade', onClick: { $callback: 'onCta' } },
              },
            ],
            features: [],
          },
          interactions: [
            {
              type: 'props',
              props: {
                plans: [
                  {
                    id: 'pro',
                    name: 'Pro',
                    price: '$12',
                    cta: { label: 'Upgrade', href: '/checkout/pro' },
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'feature values change',
          props: {
            plans: [
              { id: 'free', name: 'Free', price: '$0' },
              { id: 'pro', name: 'Pro', price: '$12' },
            ],
            features: [{ label: 'Projects', values: { free: '3', pro: 'Unlimited' } }],
          },
          interactions: [
            {
              type: 'props',
              props: {
                features: [{ label: 'Projects', values: { free: false, pro: true } }],
              },
            },
          ],
        },
      ],
    },
  ],
}
