/**
 * `@molecule/app-status-timeline-react` cases: the vertical ordered-step
 * timeline — dots colored by reached state, current step bolded.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const steps = [
  { key: 'created', label: 'Created' },
  { key: 'review', label: 'In review' },
  { key: 'done', label: 'Done' },
]
const two = [
  { key: 'created', label: 'Created' },
  { key: 'done', label: 'Done' },
]

/** `@molecule/app-status-timeline-react`. */
export const statusTimelineFeature: FeatureCases = {
  package: '@molecule/app-status-timeline-react',
  families: [
    {
      component: 'StatusTimeline',
      cases: [
        { name: 'three steps with the middle one current', props: { steps, currentKey: 'review' } },
        { name: 'first step current', props: { steps, currentKey: 'created' } },
        {
          name: 'last step current marks every step reached',
          props: { steps, currentKey: 'done' },
        },
        {
          name: 'an unknown current key renders every step unreached',
          props: { steps, currentKey: 'missing' },
        },
        { name: 'no steps renders an empty list', props: { steps: [], currentKey: 'review' } },
        {
          name: 'a single step',
          props: { steps: [{ key: 'only', label: 'Only' }], currentKey: 'only' },
        },
        {
          name: 'aria label and data-mol-id',
          props: { steps, currentKey: 'created', ariaLabel: 'Order progress', dataMolId: 'st-x' },
        },
        { name: 'a className', props: { steps, currentKey: 'done', className: 'parity-token' } },
        {
          name: 'every prop together',
          props: {
            steps,
            currentKey: 'review',
            ariaLabel: 'Order status',
            className: 'parity-token',
            dataMolId: 'st-all',
          },
        },
        {
          name: 'the current key advances',
          props: { steps, currentKey: 'created' },
          interactions: [{ type: 'props', props: { currentKey: 'done' } }],
        },
        {
          name: 'the current key moves back',
          props: { steps, currentKey: 'done' },
          interactions: [{ type: 'props', props: { currentKey: 'created' } }],
        },
        {
          name: 'steps change and the current key moves with them',
          props: { steps, currentKey: 'review' },
          interactions: [
            {
              type: 'props',
              props: {
                steps: [
                  { key: 'queued', label: 'Queued' },
                  { key: 'review', label: 'In review' },
                  { key: 'done', label: 'Done' },
                  { key: 'archived', label: 'Archived' },
                ],
                currentKey: 'archived',
              },
            },
          ],
        },
        {
          name: 'labels change under the same keys',
          props: { steps, currentKey: 'review' },
          interactions: [
            {
              type: 'props',
              props: {
                steps: [
                  { key: 'created', label: 'Placed' },
                  { key: 'review', label: 'Checking' },
                  { key: 'done', label: 'Complete' },
                ],
              },
            },
          ],
        },
        {
          name: 'className and data-mol-id change',
          props: {
            steps: two,
            currentKey: 'created',
            className: 'parity-token',
            dataMolId: 'st-a',
          },
          interactions: [
            { type: 'props', props: { className: 'parity-other', dataMolId: 'st-b' } },
          ],
        },
        {
          name: 'aria label changes',
          props: { steps: two, currentKey: 'done', ariaLabel: 'First label' },
          interactions: [{ type: 'props', props: { ariaLabel: 'Second label' } }],
        },
      ],
      keyedLists: [{ prop: 'steps', selector: 'li' }],
    },
  ],
}
