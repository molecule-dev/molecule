/**
 * `@molecule/app-time-slot-picker-react` cases: the delivery / appointment slot
 * picker — a radiogroup of selectable slots, each with a label and an optional
 * meta line, in a list or a fixed-column grid.
 *
 * Every branch is reachable from props: the layout (`list` / `grid`), the grid
 * column count (2, 3, 4), the selected id, a disabled slot, a separately
 * disabled slot becoming enabled, the optional title (text, node, empty,
 * added later), the optional meta line (present, absent, empty), node-valued
 * labels, the className passthrough and the translated radiogroup aria-label,
 * plus the `onSelect` callback and react-prop changes.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The slot list the React unit suite uses: a metad slot, a bare one, a disabled one. */
const slots = [
  { id: 'am', label: 'Morning (9–12)', meta: 'Free' },
  { id: 'pm', label: 'Afternoon (1–5)' },
  { id: 'eve', label: 'Evening (6–9)', disabled: true, meta: 'Full' },
]

/** The title a caller passes as a node rather than a string. */
const titleNode = [{ tag: 'strong', children: ['Pick a delivery window'] }]

/** `@molecule/app-time-slot-picker-react`. */
export const timeSlotPickerFeature: FeatureCases = {
  package: '@molecule/app-time-slot-picker-react',
  families: [
    {
      component: 'TimeSlotPicker',
      keyedLists: [{ prop: 'slots', selector: 'button[role="radio"]' }],
      cases: [
        { name: 'default list layout', props: { slots }, callbacks: ['onSelect'] },
        { name: 'no slots', props: { slots: [] }, callbacks: ['onSelect'] },
        {
          name: 'a selected slot',
          props: { slots, selectedId: 'pm' },
          callbacks: ['onSelect'],
        },
        {
          name: 'a selected id that matches no slot',
          props: { slots, selectedId: 'zzz' },
          callbacks: ['onSelect'],
        },
        {
          name: 'explicit list layout',
          props: { slots, layout: 'list' },
          callbacks: ['onSelect'],
        },
        {
          name: 'grid with the default column count',
          props: { slots, layout: 'grid' },
          callbacks: ['onSelect'],
        },
        {
          name: 'grid with three columns',
          props: { slots, layout: 'grid', columns: 3 },
          callbacks: ['onSelect'],
        },
        {
          name: 'grid with four columns',
          props: { slots, layout: 'grid', columns: 4 },
          callbacks: ['onSelect'],
        },
        {
          name: 'a slot with only a label',
          props: { slots: [{ id: 'solo', label: 'Solo' }] },
          callbacks: ['onSelect'],
        },
        {
          name: 'an empty meta line renders nothing',
          props: { slots: [{ id: 'solo', label: 'Solo', meta: '' }] },
          callbacks: ['onSelect'],
        },
        {
          name: 'every slot disabled',
          props: {
            slots: [
              { id: 'am', label: 'Morning', disabled: true },
              { id: 'pm', label: 'Afternoon', disabled: true },
            ],
          },
          callbacks: ['onSelect'],
        },
        {
          name: 'a text title',
          props: { slots, title: 'Pick a delivery window' },
          callbacks: ['onSelect'],
        },
        {
          name: 'a node title',
          props: { slots },
          slots: { title: titleNode },
          callbacks: ['onSelect'],
        },
        {
          name: 'an empty title renders nothing',
          props: { slots, title: '' },
          callbacks: ['onSelect'],
        },
        {
          name: 'node labels and meta lines',
          props: {
            slots: [
              {
                id: 'am',
                label: { $nodes: [{ tag: 'strong', children: ['Morning'] }] },
                meta: { $nodes: [{ tag: 'em', children: ['Free'] }] },
              },
              { id: 'pm', label: { $nodes: [{ tag: 'em', children: ['Afternoon'] }] } },
            ],
          },
          callbacks: ['onSelect'],
        },
        {
          name: 'className passthrough',
          props: { slots, className: 'tsp-cls' },
          callbacks: ['onSelect'],
        },
        {
          name: 'clicking a slot calls onSelect',
          props: { slots },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: 'button[role="radio"]' }],
        },
        {
          name: 'clicking another slot calls onSelect',
          props: { slots, selectedId: 'am' },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: 'button:nth-of-type(2)' }],
        },
        {
          name: 'a disabled slot cannot be picked',
          props: { slots },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: 'button:nth-of-type(3)' }],
        },
        {
          name: 'the selection moves with props',
          props: { slots, selectedId: 'am' },
          callbacks: ['onSelect'],
          interactions: [{ type: 'props', props: { selectedId: 'eve' } }],
        },
        {
          name: 'the layout becomes a grid',
          props: { slots },
          callbacks: ['onSelect'],
          interactions: [{ type: 'props', props: { layout: 'grid', columns: 3 } }],
        },
        {
          name: 'the column count changes',
          props: { slots, layout: 'grid', columns: 2 },
          callbacks: ['onSelect'],
          interactions: [{ type: 'props', props: { columns: 4 } }],
        },
        {
          name: 'the title is added later',
          props: { slots },
          callbacks: ['onSelect'],
          interactions: [{ type: 'props', props: { title: 'Pick a delivery window' } }],
        },
        {
          name: 'a disabled slot becomes enabled and pickable',
          props: { slots },
          callbacks: ['onSelect'],
          interactions: [
            {
              type: 'props',
              props: {
                slots: [
                  { id: 'am', label: 'Morning (9–12)', meta: 'Free' },
                  { id: 'pm', label: 'Afternoon (1–5)' },
                  { id: 'eve', label: 'Evening (6–9)', meta: 'Full' },
                ],
              },
            },
            { type: 'click', selector: 'button:nth-of-type(3)' },
          ],
        },
      ],
    },
  ],
}
