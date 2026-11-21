/**
 * `@molecule/app-nps-distribution-react` cases: the 0..10 horizontal bar chart
 * with detractor / passive / promoter color tiers and the optional computed NPS
 * score line.
 *
 * The component has no callback props and no state of its own: every branch is
 * chosen by props alone, so the interactions below change props and the bonded
 * locale. The pure helpers `computeNps` and `tierFor` are compared by value.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-nps-distribution-react`. */
export const npsDistributionFeature: FeatureCases = {
  package: '@molecule/app-nps-distribution-react',
  families: [
    {
      component: 'NpsDistribution',
      cases: [
        { name: 'defaults with mixed scores', props: { scores: [10, 9, 0] } },
        { name: 'empty scores', props: { scores: [] } },
        { name: 'one promoter', props: { scores: [10] } },
        { name: 'all detractors', props: { scores: [0, 1, 2, 3, 4, 5, 6] } },
        { name: 'passives only', props: { scores: [7, 8] } },
        {
          name: 'repeated scores scale the tallest bar',
          props: { scores: [10, 10, 10, 9, 9, 7] },
        },
        { name: 'score line hidden', props: { scores: [10, 9, 0], showScore: false } },
        { name: 'score line shown explicitly', props: { scores: [9, 0], showScore: true } },
        { name: 'custom cutoffs', props: { scores: [], detractorMax: 5, passiveMax: 7 } },
        {
          name: 'custom cutoffs move counts between tiers',
          props: { scores: [6, 6, 6], detractorMax: 5, passiveMax: 7 },
        },
        {
          name: 'className and id passthrough',
          props: { scores: [9, 10], className: 'parity-token', dataMolId: 'nps' },
        },
        {
          name: 'scores change',
          props: { scores: [1, 2, 3] },
          interactions: [{ type: 'props', props: { scores: [10, 10, 10, 0] } }],
        },
        {
          name: 'score line hides on a prop change',
          props: { scores: [10, 0] },
          interactions: [{ type: 'props', props: { showScore: false } }],
        },
        {
          name: 'cutoffs change',
          props: { scores: [] },
          interactions: [{ type: 'props', props: { detractorMax: 4, passiveMax: 9 } }],
        },
        {
          name: 'labels follow a locale switch',
          props: { scores: [10, 9, 0] },
          context: {
            translations: {
              'en-XA': {
                'nps-distribution.aria-label': 'NPS chart, {{total}} replies',
                'nps-distribution.row.aria': 'Score {{score}} ({{tier}}): {{count}}',
                'nps-distribution.score.label': 'NPS value',
                'nps-distribution.score.responses': '{{total}} replies',
                'nps-distribution.tier.detractor': 'Detractor-XA',
                'nps-distribution.tier.passive': 'Passive-XA',
                'nps-distribution.tier.promoter': 'Promoter-XA',
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'tierFor',
      calls: [
        [0, 6, 8],
        [6, 6, 8],
        [7, 6, 8],
        [8, 6, 8],
        [9, 6, 8],
        [10, 6, 8],
        [6, 5, 7],
        [8, 5, 7],
      ],
    },
    {
      export: 'computeNps',
      calls: [
        [[9, 10, 10, 9, 10]],
        [[0, 1, 3, 6, 4]],
        [[0, 10]],
        [[10, 9, 8, 7, 0]],
        [[10, 0, 0]],
        [[]],
        [[10, 5, 0, 7, 9]],
        [[-1, 11, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 7.5, 10, 0]],
        [[6, 6, 6, 5, 7]],
        [[10, 9, 0], 5, 7],
      ],
    },
  ],
}
