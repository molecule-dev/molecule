/**
 * `@molecule/app-bias-indicator-react` cases: the left/right scale with its
 * marker, the compact dot variant, the optional reliability chip and source
 * caption, plus the pure classification helpers.
 *
 * `BiasIndicator` is the package's only component; `clamp`, `biasToBucket`,
 * `reliabilityToTier`, `biasToPercent`, `bucketColor` and `tierColor` are its
 * plain-function exports.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-bias-indicator-react`. */
export const biasIndicatorFeature: FeatureCases = {
  package: '@molecule/app-bias-indicator-react',
  families: [
    {
      component: 'BiasIndicator',
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // carries a translated bias label.
        { name: 'center scale, no reliability and no source', props: { bias: 0 } },
        // The marker at 0% / 100% overflows the page edge, where Chromium's
        // clipped anti-aliasing differs between two renders of the SAME page;
        // the marker stays inside so the pixel comparison is stable. Clamping
        // (an out-of-range bias landing on an end bucket) is a pure-function
        // branch, compared exactly by the `clamp` / `biasToBucket` /
        // `biasToPercent` value checks below.
        { name: 'far left', props: { bias: -0.95 } },
        { name: 'left of center', props: { bias: -0.4 } },
        { name: 'right of center', props: { bias: 0.4 } },
        { name: 'far right', props: { bias: 0.95 } },
        // Boundary values: -0.6 and -0.2 are inclusive end buckets, 0.2 and 0.6 are not.
        { name: 'the inclusive far-left boundary', props: { bias: -0.6 } },
        { name: 'the inclusive left boundary', props: { bias: -0.2 } },
        { name: 'the exclusive right boundary', props: { bias: 0.2 } },
        { name: 'the exclusive far-right boundary', props: { bias: 0.6 } },
        {
          name: 'high reliability chip',
          props: { bias: -0.4, reliability: 0.9 },
        },
        { name: 'medium reliability chip', props: { bias: 0, reliability: 0.5 } },
        { name: 'low reliability chip', props: { bias: 0, reliability: 0.3 } },
        { name: 'disputed reliability chip', props: { bias: 0, reliability: 0.1 } },
        {
          name: 'a source caption above the scale',
          props: { bias: 0 },
          slots: { sourceLabel: ['Reuters'] },
        },
        {
          name: 'a source caption as a node',
          props: { bias: 0 },
          slots: { sourceLabel: [{ tag: 'strong', children: ['Reuters'] }] },
        },
        {
          name: 'a source caption with a reliability chip',
          props: { bias: -0.7, reliability: 0.82 },
          slots: { sourceLabel: ['AP News'] },
        },
        {
          name: 'custom classes and an id',
          props: {
            bias: 0.4,
            reliability: 0.9,
            className: 'parity-token',
            dataMolId: 'article-7-bias',
          },
        },
        {
          name: 'compact dot',
          props: { bias: -0.8, compact: true },
        },
        {
          name: 'compact dot with a reliability tier',
          props: { bias: 0.4, reliability: 0.4, compact: true },
        },
        {
          name: 'compact dot with a source caption',
          props: { bias: 0, compact: true },
          slots: { sourceLabel: ['Reuters'] },
        },
        {
          name: 'compact dot with a node caption, classes and an id',
          props: {
            bias: 1,
            compact: true,
            className: 'parity-compact',
            dataMolId: 'compact-bias',
          },
          slots: { sourceLabel: [{ tag: 'em', children: ['Fox News'] }] },
        },
        {
          name: 'the bias value changes after mount',
          props: { bias: -0.4 },
          interactions: [
            { type: 'props', props: { bias: 0 } },
            { type: 'props', props: { bias: 0.9 } },
          ],
        },
        {
          name: 'reliability arrives, changes tier and goes away',
          props: { bias: 0 },
          interactions: [
            { type: 'props', props: { reliability: 0.9 } },
            { type: 'props', props: { reliability: 0.3 } },
            { type: 'props', props: { reliability: undefined } },
          ],
        },
        {
          name: 'the compact variant toggles after mount',
          props: { bias: 0.4, reliability: 0.9 },
          interactions: [
            { type: 'props', props: { compact: true } },
            { type: 'props', props: { compact: false } },
          ],
        },
        {
          name: 'the source caption stays while the bias changes',
          props: { bias: 0 },
          slots: { sourceLabel: ['Reuters'] },
          interactions: [{ type: 'props', props: { bias: -0.8 } }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'clamp',
      calls: [
        [0.3, -1, 1],
        [-2, -1, 1],
        [2, -1, 1],
        [Number.NaN, -1, 1],
        [0, 0, 1],
        [1, 0, 1],
        [-0.5, -1, 0],
      ],
    },
    {
      export: 'biasToBucket',
      calls: [
        [-1],
        [-0.6],
        [-0.59],
        [-0.4],
        [-0.2],
        [-0.19],
        [0],
        [0.19],
        [0.2],
        [0.4],
        [0.59],
        [0.6],
        [1],
        [-5],
        [5],
        [Number.NaN],
      ],
    },
    {
      export: 'reliabilityToTier',
      calls: [[1], [0.75], [0.74], [0.5], [0.49], [0.25], [0.24], [0], [-1], [2], [Number.NaN]],
    },
    {
      export: 'biasToPercent',
      calls: [[-1], [-0.5], [0], [0.25], [0.5], [1], [-3], [3], [Number.NaN]],
    },
    {
      export: 'bucketColor',
      calls: [['far-left'], ['left'], ['center'], ['right'], ['far-right']],
    },
    {
      export: 'tierColor',
      calls: [['high'], ['medium'], ['low'], ['disputed']],
    },
  ],
}
