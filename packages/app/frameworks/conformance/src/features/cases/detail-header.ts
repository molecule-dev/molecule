/**
 * `@molecule/app-detail-header-react` cases: the detail-page top bar — title,
 * subtitle, the leading/status/search/actions slots, the meta row, and
 * stickiness.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-detail-header-react`. */
export const detailHeaderFeature: FeatureCases = {
  package: '@molecule/app-detail-header-react',
  families: [
    {
      component: 'DetailHeader',
      cases: [
        { name: 'title only', props: { title: 'Invoice #42' } },
        { name: 'title with a subtitle', props: { title: 'Invoice #42', subtitle: 'due soon' } },
        {
          name: 'node title and subtitle',
          slots: {
            title: [{ tag: 'strong', children: ['Project Alpha'] }],
            subtitle: [{ tag: 'em', children: ['Last updated 2 hours ago'] }],
          },
        },
        {
          name: 'leading, status, search and actions slots',
          props: { title: 'Order #7' },
          slots: {
            leading: [{ tag: 'span', attrs: { 'data-leading': '' } }],
            status: [{ tag: 'span', attrs: { 'data-status': '' }, children: ['Active'] }],
            search: [{ tag: 'input', attrs: { 'data-search': '', placeholder: 'Search' } }],
            actions: [
              { tag: 'button', attrs: { 'data-actions': '', type: 'button' }, children: ['Edit'] },
            ],
          },
        },
        {
          name: 'meta row with chips',
          props: { title: 'Order #7' },
          slots: {
            meta: [
              { tag: 'span', attrs: { 'data-chip': '' }, children: ['Owner: Alice'] },
              { tag: 'span', attrs: { 'data-chip': '' }, children: ['Team: Core'] },
            ],
          },
        },
        {
          name: 'every slot, the meta row and stickiness',
          props: {
            title: 'Order #7',
            subtitle: 'Placed yesterday',
            sticky: true,
            className: 'parity-token',
            dataMolId: 'dh-x',
          },
          slots: {
            leading: [{ tag: 'span', attrs: { 'data-leading': '' } }],
            status: [{ tag: 'span', attrs: { 'data-status': '' }, children: ['Active'] }],
            search: [{ tag: 'input', attrs: { 'data-search': '' } }],
            actions: [{ tag: 'button', attrs: { 'data-actions': '' }, children: ['Edit'] }],
            meta: [{ tag: 'span', attrs: { 'data-chip': '' }, children: ['Owner: Alice'] }],
          },
        },
        { name: 'empty-string subtitle renders no paragraph', props: { title: 'T', subtitle: '' } },
        {
          name: 'sticky toggles on',
          props: { title: 'T' },
          interactions: [{ type: 'props', props: { sticky: true } }],
        },
        {
          name: 'sticky toggles off',
          props: { title: 'T', sticky: true },
          interactions: [{ type: 'props', props: { sticky: false } }],
        },
        {
          name: 'subtitle appears on change',
          props: { title: 'T' },
          interactions: [{ type: 'props', props: { subtitle: 'now due' } }],
        },
        {
          name: 'subtitle is removed on change',
          props: { title: 'T', subtitle: 'due soon' },
          interactions: [{ type: 'props', props: { subtitle: null } }],
        },
        {
          name: 'title changes',
          props: { title: 'Invoice #42' },
          interactions: [{ type: 'props', props: { title: 'Invoice #43' } }],
        },
        {
          name: 'className and data-mol-id change',
          props: { title: 'T', className: 'parity-token', dataMolId: 'dh-x' },
          interactions: [
            { type: 'props', props: { className: 'parity-other', dataMolId: 'dh-y' } },
          ],
        },
      ],
    },
  ],
}
