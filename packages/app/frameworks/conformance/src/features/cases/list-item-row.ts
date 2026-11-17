/**
 * `@molecule/app-list-item-row-react` cases: the generic "thumbnail + text +
 * actions" list row — leading slot, up to three text lines, right-side actions.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-list-item-row-react`. */
export const listItemRowFeature: FeatureCases = {
  package: '@molecule/app-list-item-row-react',
  families: [
    {
      component: 'ListItemRow',
      cases: [
        { name: 'title only', props: { title: 'Inbox' } },
        {
          name: 'title, subtitle and metadata',
          props: {
            title: 'Project Alpha',
            subtitle: 'Last edited 2 hours ago',
            metadata: '3 collaborators · 12 files',
          },
        },
        {
          name: 'leading and actions slots',
          props: { title: 'Project Alpha' },
          slots: {
            leading: [{ tag: 'span', attrs: { 'data-leading': '' } }],
            actions: [{ tag: 'span', attrs: { 'data-actions': '' } }],
          },
        },
        {
          name: 'title slot node',
          props: {},
          slots: {
            title: [{ tag: 'span', attrs: { 'data-title': '' }, children: ['Slotted title'] }],
          },
        },
        { name: 'selected', props: { title: 'T', selected: true } },
        { name: 'selected false', props: { title: 'T', selected: false } },
        { name: 'disabled', props: { title: 'T', disabled: true } },
        { name: 'compact density', props: { title: 'T', density: 'compact' } },
        { name: 'className passthrough', props: { title: 'T', className: 'parity-token' } },
        {
          name: 'clickable row calls onClick',
          props: { title: 'Project Alpha' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="list-item-row-open"]' }],
        },
        {
          name: 'disabled clickable row ignores clicks',
          props: { title: 'T', disabled: true },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'div' }],
        },
        {
          name: 'actions click does not trigger the row onClick',
          props: { title: 'T' },
          callbacks: ['onClick'],
          slots: {
            actions: [{ tag: 'span', attrs: { 'data-actions': '' }, children: ['Menu'] }],
          },
          interactions: [{ type: 'click', selector: 'span' }],
        },
        {
          name: 'open button activates a row with actions',
          props: { title: 'T', leading: '…' },
          callbacks: ['onClick'],
          slots: {
            actions: [{ tag: 'span', attrs: { 'data-actions': '' }, children: ['Menu'] }],
          },
          interactions: [
            { type: 'click', selector: '[data-mol-id="list-item-row-open"]' },
            { type: 'click', selector: 'span' },
          ],
        },
        {
          name: 'density changes',
          props: { title: 'T', density: 'compact' },
          interactions: [{ type: 'props', props: { density: 'comfortable' } }],
        },
        {
          name: 'subtitle appears on a later render',
          props: { title: 'T' },
          interactions: [{ type: 'props', props: { subtitle: 'New subtitle' } }],
        },
        {
          name: 'selected flips',
          props: { title: 'T', selected: true },
          interactions: [{ type: 'props', props: { selected: false } }],
        },
        {
          name: 'disabled flips on a clickable row',
          props: { title: 'T' },
          callbacks: ['onClick'],
          interactions: [
            { type: 'props', props: { disabled: true } },
            { type: 'click', selector: 'div' },
          ],
        },
        {
          name: 'title changes',
          props: { title: 'Before', subtitle: 'sub-x' },
          interactions: [{ type: 'props', props: { title: 'After' } }],
        },
      ],
    },
  ],
}
