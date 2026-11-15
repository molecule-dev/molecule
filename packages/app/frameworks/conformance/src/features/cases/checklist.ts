/**
 * `@molecule/app-checklist-react` cases: the onboarding checklist — a list of
 * checkable items, an optional title, and an overall progress bar derived from
 * the items.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The two-item list the React unit suite uses: one done, one open with a hint. */
const items = [
  { id: 'a', label: 'Set up profile', completed: true },
  { id: 'b', label: 'Invite team', completed: false, description: 'Add at least one teammate' },
]

/** `@molecule/app-checklist-react`. */
export const checklistFeature: FeatureCases = {
  package: '@molecule/app-checklist-react',
  families: [
    {
      component: 'Checklist',
      cases: [
        {
          name: 'defaults: progress summary and items',
          props: { items },
          callbacks: ['onToggle'],
        },
        {
          name: 'no items',
          props: { items: [] },
          callbacks: ['onToggle'],
        },
        {
          name: 'every item complete',
          props: {
            items: [
              { id: 'a', label: 'Set up profile', completed: true },
              { id: 'b', label: 'Invite team', completed: true },
            ],
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'the percentage rounds',
          props: {
            items: [
              { id: 'a', label: 'First', completed: true },
              { id: 'b', label: 'Second', completed: false },
              { id: 'c', label: 'Third', completed: false },
            ],
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'showProgress true',
          props: { items, showProgress: true },
          callbacks: ['onToggle'],
        },
        {
          name: 'showProgress false',
          props: { items, showProgress: false },
          callbacks: ['onToggle'],
        },
        {
          name: 'a text title',
          props: { items, title: 'Get started' },
          callbacks: ['onToggle'],
        },
        {
          name: 'a node title',
          slots: { title: [{ tag: 'strong', children: ['Get started'] }] },
          props: { items },
          callbacks: ['onToggle'],
        },
        {
          name: 'an empty title renders nothing',
          props: { items, title: '' },
          callbacks: ['onToggle'],
        },
        {
          name: 'an empty description renders nothing',
          props: {
            items: [{ id: 'a', label: 'Set up profile', completed: false, description: '' }],
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'a disabled item',
          props: {
            items: [
              { id: 'a', label: 'Set up profile', completed: true },
              { id: 'b', label: 'Invite team', completed: false, disabled: true },
            ],
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'node labels and descriptions',
          props: {
            items: [
              {
                id: 'a',
                label: { $nodes: [{ tag: 'strong', children: ['Profile'] }] },
                completed: false,
              },
              {
                id: 'b',
                label: { $nodes: [{ tag: 'em', children: ['Invite'] }] },
                description: { $nodes: [{ tag: 'small', children: ['Add a teammate'] }] },
                completed: true,
              },
            ],
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'className passthrough',
          props: { items, className: 'cl-cls' },
          callbacks: ['onToggle'],
        },
        {
          name: 'clicking a completed item toggles it off',
          props: { items },
          callbacks: ['onToggle'],
          interactions: [{ type: 'click', selector: 'input[type="checkbox"]' }],
        },
        {
          name: 'clicking an open item toggles it on',
          props: { items },
          callbacks: ['onToggle'],
          interactions: [{ type: 'click', selector: 'li:nth-child(2) input[type="checkbox"]' }],
        },
        {
          name: 'checking an item reports the new state',
          props: { items },
          callbacks: ['onToggle'],
          interactions: [{ type: 'check', selector: 'li:nth-child(2) input', checked: true }],
        },
        {
          name: 'a disabled item cannot be toggled',
          props: {
            items: [
              { id: 'a', label: 'Set up profile', completed: true },
              { id: 'b', label: 'Invite team', completed: false, disabled: true },
            ],
          },
          callbacks: ['onToggle'],
          interactions: [{ type: 'click', selector: 'li:nth-child(2) input[type="checkbox"]' }],
        },
        {
          name: 'a node-label checkbox is labelled by its id',
          props: {
            items: [
              {
                id: 'profile',
                label: { $nodes: [{ tag: 'strong', children: ['Profile'] }] },
                completed: false,
              },
            ],
          },
          callbacks: ['onToggle'],
        },
        {
          name: 'new items update the progress and strikes',
          props: { items },
          callbacks: ['onToggle'],
          interactions: [
            {
              type: 'props',
              props: {
                items: [
                  { id: 'a', label: 'Set up profile', completed: true },
                  { id: 'b', label: 'Invite team', completed: true },
                ],
              },
            },
          ],
        },
        {
          name: 'showProgress can be turned off later',
          props: { items },
          callbacks: ['onToggle'],
          interactions: [{ type: 'props', props: { showProgress: false } }],
        },
        {
          name: 'a title can be added later',
          props: { items },
          callbacks: ['onToggle'],
          interactions: [{ type: 'props', props: { title: 'Get started' } }],
        },
      ],
    },
  ],
}
