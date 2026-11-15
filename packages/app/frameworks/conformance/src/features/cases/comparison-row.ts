/**
 * `@molecule/app-comparison-row-react` cases: the period-over-period stat
 * comparison row.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-comparison-row-react`. */
export const comparisonRowFeature: FeatureCases = {
  package: '@molecule/app-comparison-row-react',
  families: [
    {
      component: 'ComparisonRow',
      cases: [
        { name: 'label and current only', props: { label: 'Revenue', current: '$24,800' } },
        {
          name: 'previous value',
          props: { label: 'Revenue', current: '$24,800', previous: '$21,300' },
        },
        { name: 'positive delta', props: { label: 'Revenue', current: '$1', deltaPct: 16.4 } },
        { name: 'negative delta', props: { label: 'Revenue', current: '$1', deltaPct: -8 } },
        { name: 'zero delta', props: { label: 'Revenue', current: '$1', deltaPct: 0 } },
        {
          name: 'fractional negative delta',
          props: { label: 'Revenue', current: '$1', deltaPct: -3.2 },
        },
        {
          name: 'period label with everything',
          props: {
            label: 'Revenue',
            current: '$24,800',
            previous: '$21,300',
            deltaPct: 16.4,
            periodLabel: 'vs. last month',
          },
        },
        {
          name: 'className passthrough',
          props: { label: 'Revenue', current: '$1', className: 'parity-token' },
        },
        {
          name: 'node label, current, previous and period label',
          props: { deltaPct: 2 },
          slots: {
            label: [{ tag: 'strong', children: ['Revenue'] }],
            current: [{ tag: 'em', children: ['$24,800'] }],
            previous: [{ tag: 's', children: ['$21,300'] }],
            periodLabel: [{ tag: 'small', children: ['vs. last month'] }],
          },
        },
        {
          name: 'custom formatDelta with markup',
          props: {
            label: 'Revenue',
            current: '$1',
            deltaPct: 5,
            formatDelta: {
              $fn: 'fmt',
              nodes: [{ tag: 'strong', children: ['delta {0} pts'] }],
            },
          },
        },
        {
          name: 'custom formatDelta returning text',
          props: {
            label: 'Revenue',
            current: '$1',
            deltaPct: -12.5,
            formatDelta: { $fn: 'fmt', nodes: ['down {0}% to plan'] },
          },
        },
        {
          name: 'delta change flips arrow and color',
          props: { label: 'Revenue', current: '$1', deltaPct: 12 },
          interactions: [{ type: 'props', props: { deltaPct: -5 } }],
        },
        {
          name: 'a custom formatter follows the delta',
          props: {
            label: 'Revenue',
            current: '$1',
            deltaPct: 4,
            formatDelta: { $fn: 'fmt', nodes: ['delta {0}'] },
          },
          interactions: [{ type: 'props', props: { deltaPct: -6.5 } }],
        },
        {
          name: 'previous and period label appear',
          props: { label: 'Revenue', current: '$1' },
          interactions: [
            { type: 'props', props: { previous: '$2', periodLabel: 'vs. last week' } },
          ],
        },
        {
          name: 'delta appears on a later render',
          props: { label: 'Revenue', current: '$1' },
          interactions: [{ type: 'props', props: { deltaPct: -4 } }],
        },
      ],
    },
  ],
}
