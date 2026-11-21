/**
 * `@molecule/app-note-card-react` cases: the sticky-note style card.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** An actions cluster: one button, the way a caller fills the `actions` slot. */
const actions = [
  {
    tag: 'button',
    attrs: { 'data-actions': '' },
    children: ['Edit'],
  },
]

/** `@molecule/app-note-card-react`. */
export const noteCardFeature: FeatureCases = {
  package: '@molecule/app-note-card-react',
  families: [
    {
      component: 'NoteCard',
      cases: [
        { name: 'body only', props: { body: 'Remember the milk' } },
        { name: 'title and body', props: { title: 'Groceries', body: 'Milk, eggs, coffee' } },
        { name: 'custom color', props: { body: 'b', color: '#dbeafe' } },
        { name: 'pinned', props: { body: 'b', pinned: true } },
        { name: 'modified at', props: { body: 'b', modifiedAt: 'edited 2h ago' } },
        {
          name: 'actions only',
          props: { body: 'b' },
          slots: { actions },
        },
        {
          name: 'modified at and actions',
          props: { body: 'b', modifiedAt: 'Jun 5, 2026' },
          slots: { actions },
        },
        {
          name: 'node title and node body',
          slots: {
            title: [{ tag: 'strong', children: ['Ship it'] }],
            body: [{ tag: 'span', attrs: { 'data-rich': '' }, children: ['Rich body'] }],
          },
        },
        {
          name: 'everything together',
          props: {
            title: 'Meeting notes',
            body: 'Follow up with design team on the new dashboard layout.',
            color: '#dcfce7',
            pinned: true,
            modifiedAt: 'Jun 5, 2026',
            className: 'parity-token',
          },
          slots: { actions },
        },
        {
          name: 'falsy strings omit their branches',
          props: { title: '', body: 'b', modifiedAt: '', pinned: false },
        },
        {
          name: 'click calls onClick',
          props: { title: 'Groceries', body: 'b' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="note-card-open"]' }],
        },
        {
          name: 'clickable card forwards className',
          props: { body: 'b', className: 'parity-token' },
          callbacks: ['onClick'],
        },
        {
          name: 'an inner control click records no onClick',
          props: { body: 'b' },
          slots: { actions },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: '[data-actions]' }],
        },
        {
          name: 'props change unpins and retints',
          props: { body: 'b', pinned: true, color: '#dbeafe' },
          interactions: [{ type: 'props', props: { pinned: false, color: '#fee2e2' } }],
        },
        {
          name: 'props change adds a footer and updates the body',
          props: { body: 'First draft' },
          interactions: [
            { type: 'props', props: { body: 'Second draft', modifiedAt: 'just now' } },
          ],
        },
      ],
    },
  ],
}
