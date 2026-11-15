/**
 * `@molecule/app-order-timeline-react` cases: the order / shipment progress
 * timeline — placed → shipped → delivered milestones with connector lines,
 * colored status nodes and an optional ETA line.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The three-milestone flow the React unit suite uses: done, current, pending. */
const milestones = [
  { id: 'placed', label: 'Order placed', detail: 'Mar 1', completed: true },
  { id: 'shipped', label: 'Shipped', detail: 'Mar 3', current: true },
  { id: 'delivered', label: 'Delivered' },
]

/** The same flow with nothing reached yet. */
const pending = [
  { id: 'placed', label: 'Order placed' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
]

/** The same flow completed end to end. */
const completed = [
  { id: 'placed', label: 'Order placed', detail: 'Mar 1', completed: true },
  { id: 'shipped', label: 'Shipped', detail: 'Mar 3', completed: true },
  { id: 'delivered', label: 'Delivered', detail: 'Mar 5', completed: true },
]

/** `@molecule/app-order-timeline-react`. */
export const orderTimelineFeature: FeatureCases = {
  package: '@molecule/app-order-timeline-react',
  families: [
    {
      component: 'OrderTimeline',
      cases: [
        { name: 'defaults: horizontal flow', props: { milestones } },
        { name: 'every milestone pending', props: { milestones: pending } },
        { name: 'every milestone completed', props: { milestones: completed } },
        {
          name: 'a milestone both current and completed is current-colored',
          props: {
            milestones: [
              { id: 'placed', label: 'Order placed', completed: true },
              { id: 'shipped', label: 'Shipped', completed: true, current: true },
              { id: 'delivered', label: 'Delivered' },
            ],
          },
        },
        {
          name: 'a single milestone',
          props: { milestones: [{ id: 'only', label: 'Only', completed: true }] },
        },
        { name: 'no milestones', props: { milestones: [] } },
        { name: 'vertical orientation', props: { milestones, orientation: 'vertical' } },
        {
          name: 'vertical with every milestone completed',
          props: { milestones: completed, orientation: 'vertical' },
        },
        {
          name: 'an explicit horizontal orientation',
          props: { milestones, orientation: 'horizontal' },
        },
        { name: 'a text eta', props: { milestones, eta: 'Arrives Mar 5' } },
        {
          name: 'a node eta',
          props: { milestones },
          slots: { eta: [{ tag: 'strong', children: ['Arrives Mar 5'] }] },
        },
        { name: 'an empty eta renders nothing', props: { milestones, eta: '' } },
        {
          name: 'an empty detail renders nothing',
          props: {
            milestones: [
              { id: 'placed', label: 'Order placed', detail: '', completed: true },
              { id: 'delivered', label: 'Delivered' },
            ],
          },
        },
        {
          name: 'node labels and details',
          props: {
            milestones: [
              {
                id: 'placed',
                label: { $nodes: [{ tag: 'strong', children: ['Order placed'] }] },
                detail: { $nodes: [{ tag: 'em', children: ['Mar 1'] }] },
                completed: true,
              },
              {
                id: 'shipped',
                label: { $nodes: [{ tag: 'em', children: ['Shipped'] }] },
                current: true,
              },
              { id: 'delivered', label: 'Delivered' },
            ],
          },
        },
        { name: 'a className', props: { milestones, className: 'parity-token' } },
        {
          name: 'every prop together',
          props: {
            milestones,
            eta: 'Arrives Mar 5',
            orientation: 'vertical',
            className: 'parity-token',
          },
        },
        {
          name: 'the current milestone advances',
          props: { milestones },
          interactions: [
            {
              type: 'props',
              props: {
                milestones: [
                  { id: 'placed', label: 'Order placed', detail: 'Mar 1', completed: true },
                  { id: 'shipped', label: 'Shipped', detail: 'Mar 3', completed: true },
                  { id: 'delivered', label: 'Delivered', current: true },
                ],
              },
            },
          ],
        },
        {
          name: 'labels change under the same ids',
          props: { milestones },
          interactions: [
            {
              type: 'props',
              props: {
                milestones: [
                  { id: 'placed', label: 'Placed', detail: 'Mar 1', completed: true },
                  { id: 'shipped', label: 'On its way', detail: 'Mar 3', current: true },
                  { id: 'delivered', label: 'Arrived' },
                ],
              },
            },
          ],
        },
        {
          name: 'a detail is added later',
          props: { milestones: pending },
          interactions: [
            {
              type: 'props',
              props: {
                milestones: [
                  { id: 'placed', label: 'Order placed', detail: 'Mar 1', completed: true },
                  { id: 'shipped', label: 'Shipped' },
                  { id: 'delivered', label: 'Delivered' },
                ],
              },
            },
          ],
        },
        {
          name: 'milestones are added and removed',
          props: { milestones },
          interactions: [
            {
              type: 'props',
              props: {
                milestones: [
                  { id: 'queued', label: 'Queued' },
                  { id: 'placed', label: 'Order placed', detail: 'Mar 1', completed: true },
                  { id: 'shipped', label: 'Shipped', detail: 'Mar 3', current: true },
                ],
              },
            },
          ],
        },
        {
          name: 'the orientation switches to vertical',
          props: { milestones },
          interactions: [{ type: 'props', props: { orientation: 'vertical' } }],
        },
        {
          name: 'the orientation switches back to horizontal',
          props: { milestones, orientation: 'vertical' },
          interactions: [{ type: 'props', props: { orientation: 'horizontal' } }],
        },
        {
          name: 'an eta is added later',
          props: { milestones },
          interactions: [{ type: 'props', props: { eta: 'Arrives Mar 5' } }],
        },
        {
          name: 'an eta is removed later',
          props: { milestones, eta: 'Arrives Mar 5' },
          interactions: [{ type: 'props', props: { eta: '' } }],
        },
        {
          name: 'the className changes',
          props: { milestones, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
      keyedLists: [{ prop: 'milestones', selector: 'div > div:first-child > div' }],
    },
  ],
}
