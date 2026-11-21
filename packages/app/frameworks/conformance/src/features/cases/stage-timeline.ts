/**
 * `@molecule/app-stage-timeline-react` cases: the horizontal stage timeline,
 * its connector rail and every stage marker.
 *
 * Every runtime export of the React package is covered: `StageTimeline` (the
 * family below) and `statusOf` (a pure function, compared by value). The
 * component reads the app's i18n provider (`useTranslation()`), so the family's
 * first case is re-run after a locale switch, like every other feature case.
 *
 * The cases walk every branch: an empty stage list (the component's own early
 * return, with and without `className`/`dataMolId`), a single stage (whose
 * denominator is clamped to 1), `currentIndex` at `-1`, `0`, in the middle,
 * `stages.length` and past the end, fixed and growing stage counts, plain,
 * numeric and node-valued labels and subtitles (the aria label only carries a
 * string label), a per-stage `onClick` (a nested callback) beside disabled
 * dots, `className`/`dataMolId` pass-through, and interactions that change
 * `stages`, `currentIndex`, add a subtitle and remove the class/id again. The
 * stages are keyed by `id`, so `keyedLists` proves a re-passed or re-ordered
 * list keeps each stage's DOM.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const stages = [
  { id: 'applied', label: 'Applied' },
  { id: 'screen', label: 'Phone Screen' },
  { id: 'onsite', label: 'On-site' },
  { id: 'offer', label: 'Offer' },
]

const twoStages = [
  { id: 'applied', label: 'Applied' },
  { id: 'screen', label: 'Phone Screen' },
]

const threeStages = [
  { id: 'applied', label: 'Applied' },
  { id: 'screen', label: 'Phone Screen' },
  { id: 'offer', label: 'Offer' },
]

/** `@molecule/app-stage-timeline-react`. */
export const stageTimelineFeature: FeatureCases = {
  package: '@molecule/app-stage-timeline-react',
  families: [
    {
      component: 'StageTimeline',
      cases: [
        { name: 'no stages', props: { stages: [], currentIndex: 0 } },
        {
          name: 'an empty list with classes and an id',
          props: { stages: [], currentIndex: 2, className: 'parity-token', dataMolId: 'hire-flow' },
        },
        { name: 'a single stage', props: { stages: [stages[0]!], currentIndex: 0 } },
        { name: 'nothing started', props: { stages, currentIndex: -1 } },
        { name: 'the first stage is current', props: { stages, currentIndex: 0 } },
        { name: 'the third stage is current', props: { stages, currentIndex: 2 } },
        { name: 'every stage is done', props: { stages, currentIndex: 4 } },
        { name: 'the current index is past the end', props: { stages, currentIndex: 99 } },
        { name: 'two stages, the first current', props: { stages: twoStages, currentIndex: 0 } },
        { name: 'three stages, half way', props: { stages: threeStages, currentIndex: 1 } },
        {
          name: 'subtitles and an absent subtitle',
          props: {
            stages: [
              { id: 'applied', label: 'Applied', subtitle: 'Mar 5' },
              { id: 'screen', label: 'Phone Screen', subtitle: '' },
              { id: 'offer', label: 'Offer' },
            ],
            currentIndex: 1,
          },
        },
        {
          name: 'node-valued labels, subtitles and a numeric label',
          props: {
            stages: [
              {
                id: 'n1',
                label: { $nodes: [{ tag: 'strong', children: ['Nia applied'] }] },
                subtitle: { $nodes: [{ tag: 'time', children: ['09:30'] }] },
              },
              { id: 'n2', label: 7 },
              {
                id: 'n3',
                label: 'Plain',
                subtitle: { $nodes: [{ tag: 'em', children: ['soon'] }] },
              },
            ],
            currentIndex: 0,
          },
        },
        {
          name: 'a stage with an onClick calls it',
          props: {
            stages: [
              { id: 'applied', label: 'Applied', onClick: { $callback: 'stageClick' } },
              { id: 'screen', label: 'Phone Screen' },
            ],
            currentIndex: 1,
          },
          interactions: [
            {
              type: 'click',
              selector: '[data-stage-id="applied"] [data-mol-id="stage-timeline-dot"]',
            },
          ],
        },
        {
          name: 'every stage has its own onClick',
          props: {
            stages: [
              { id: 'applied', label: 'Applied', onClick: { $callback: 'stageClick' } },
              { id: 'screen', label: 'Phone Screen', onClick: { $callback: 'stageClick' } },
            ],
            currentIndex: 0,
          },
          interactions: [
            {
              type: 'click',
              selector: '[data-stage-id="applied"] [data-mol-id="stage-timeline-dot"]',
            },
            {
              type: 'click',
              selector: '[data-stage-id="screen"] [data-mol-id="stage-timeline-dot"]',
            },
          ],
        },
        {
          name: 'classes and an id',
          props: { stages, currentIndex: 1, className: 'parity-token', dataMolId: 'hire-flow' },
        },
        {
          name: 'the current stage advances',
          props: { stages, currentIndex: 1 },
          interactions: [{ type: 'props', props: { currentIndex: 3 } }],
        },
        {
          name: 'the stages change',
          props: { stages: twoStages, currentIndex: 1 },
          interactions: [{ type: 'props', props: { stages: threeStages } }],
        },
        {
          name: 'the stages are emptied',
          props: { stages, currentIndex: 1 },
          interactions: [{ type: 'props', props: { stages: [] } }],
        },
        {
          name: 'a subtitle appears',
          props: { stages: [stages[0]!, stages[1]!], currentIndex: 1 },
          interactions: [
            {
              type: 'props',
              props: { stages: [{ id: 'screen', label: 'Phone Screen', subtitle: 'Mar 5' }] },
            },
          ],
        },
        {
          name: 'the class name and id are removed',
          props: { stages, currentIndex: 2, className: 'parity-token', dataMolId: 'hire-flow' },
          interactions: [{ type: 'props', props: { className: undefined, dataMolId: undefined } }],
        },
      ],
      keyedLists: [
        { prop: 'stages', selector: '[data-stage-id]', caseName: 'the third stage is current' },
      ],
    },
  ],
  values: [
    {
      export: 'statusOf',
      calls: [
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
        [0, -1],
        [2, -1],
        [0, 4],
        [3, 4],
        [0, 0],
      ],
    },
  ],
}
