/**
 * `@molecule/app-sparkline-react` cases: the tiny inline SVG trend chart.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const week = [12, 18, 15, 22, 30, 27, 35]

/** `@molecule/app-sparkline-react`. */
export const sparklineFeature: FeatureCases = {
  package: '@molecule/app-sparkline-react',
  families: [
    {
      component: 'Sparkline',
      cases: [
        { name: 'line by default', props: { values: week } },
        { name: 'empty values renders nothing', props: { values: [] } },
        { name: 'single value renders one zero-step segment', props: { values: [7] } },
        { name: 'constant series sits along the bottom edge', props: { values: [7, 7, 7] } },
        { name: 'bar variant', props: { values: [1, 5, 2], variant: 'bar' } },
        { name: 'dot variant', props: { values: [1, 5, 2], variant: 'dot' } },
        {
          name: 'custom label and size',
          props: { values: [1, 2], ariaLabel: 'Sales trend', width: 120, height: 40 },
        },
        {
          name: 'custom color and className',
          props: { values: [1, 2], color: '#ff0000', className: 'spk-cls' },
        },
        {
          name: 'variant changes',
          props: { values: [1, 5, 2] },
          interactions: [{ type: 'props', props: { variant: 'bar' } }],
        },
        {
          name: 'size and label change',
          props: { values: [1, 2, 3], width: 60, ariaLabel: 'First' },
          interactions: [{ type: 'props', props: { width: 100, height: 48, ariaLabel: 'Second' } }],
        },
        {
          name: 'values change reshapes the line',
          props: { values: [1, 5, 2] },
          interactions: [{ type: 'props', props: { values: [10, 0, 10, 5] } }],
        },
        {
          name: 'clearing to empty renders nothing',
          props: { values: [1, 2] },
          interactions: [{ type: 'props', props: { values: [] } }],
        },
      ],
      keyedLists: [{ prop: 'values', selector: 'rect', caseName: 'bar variant' }],
    },
  ],
}
