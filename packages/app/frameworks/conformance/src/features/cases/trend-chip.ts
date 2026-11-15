/**
 * `@molecule/app-trend-chip-react` cases: the standalone trend delta chip.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-trend-chip-react`. */
export const trendChipFeature: FeatureCases = {
  package: '@molecule/app-trend-chip-react',
  families: [
    {
      component: 'TrendChip',
      cases: [
        { name: 'positive delta', props: { delta: 12 } },
        { name: 'negative delta', props: { delta: -8 } },
        { name: 'zero delta', props: { delta: 0 } },
        { name: 'direction overrides a positive delta', props: { delta: 5, direction: 'down' } },
        { name: 'direction overrides a negative delta', props: { delta: -5, direction: 'up' } },
        { name: 'direction flat', props: { delta: 3, direction: 'flat' } },
        { name: 'custom suffix', props: { delta: 3, suffix: 'pts' } },
        { name: 'empty suffix', props: { delta: 3, suffix: '' } },
        { name: 'string prefix feeds the default aria label', props: { delta: 2, prefix: '$' } },
        {
          name: 'element prefix with an explicit aria label',
          props: { delta: 4, variant: 'pill', ariaLabel: 'up four percent' },
          slots: { prefix: [{ tag: 'strong', children: ['+'] }] },
        },
        { name: 'pill variant', props: { delta: 4, variant: 'pill' } },
        { name: 'pill variant with a fractional delta', props: { delta: -4.5, variant: 'pill' } },
        { name: 'aria label override', props: { delta: 1, ariaLabel: 'Up one percent' } },
        { name: 'className passthrough', props: { delta: 1, className: 'parity-token' } },
        {
          name: 'delta change flips arrow and color',
          props: { delta: 12 },
          interactions: [{ type: 'props', props: { delta: -3 } }],
        },
        {
          name: 'variant and direction change',
          props: { delta: 4 },
          interactions: [{ type: 'props', props: { variant: 'pill', direction: 'down' } }],
        },
      ],
    },
  ],
}
