/**
 * `@molecule/app-breadcrumb-react` cases: the crumb trail, its separators,
 * icons, node labels and the `onNavigate` callback.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const linked = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]
const two = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
]

/** `@molecule/app-breadcrumb-react`. */
export const breadcrumbFeature: FeatureCases = {
  package: '@molecule/app-breadcrumb-react',
  families: [
    {
      component: 'Breadcrumb',
      cases: [
        { name: 'linked crumbs with plain labels', props: { items: linked } },
        {
          name: 'buttons call onNavigate',
          props: { items: linked },
          callbacks: ['onNavigate'],
          interactions: [{ type: 'click', selector: 'nav > span:nth-child(1) button' }],
        },
        {
          name: 'each button calls with its own target',
          props: { items: linked },
          callbacks: ['onNavigate'],
          interactions: [
            { type: 'click', selector: 'nav > span:nth-child(1) button' },
            { type: 'click', selector: 'nav > span:nth-child(2) button' },
          ],
        },
        {
          name: 'clicking an anchor crumb keeps the default',
          props: { items: linked },
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'unlinked middle crumb renders plain text',
          props: {
            items: [{ label: 'Home', to: '/' }, { label: 'Nowhere' }, { label: 'End', to: '/end' }],
          },
        },
        { name: 'no items renders an empty nav', props: { items: [] } },
        { name: 'single crumb has no separator', props: { items: [{ label: 'Only' }] } },
        {
          name: 'custom separator node',
          props: { items: two },
          slots: { separator: [{ tag: 'span', attrs: { 'data-sep': '' }, children: ['›'] }] },
        },
        { name: 'text separator', props: { items: two }, slots: { separator: ['·'] } },
        {
          name: 'crumb icons',
          props: {
            items: [
              {
                label: 'Home',
                to: '/',
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': '' } }] },
              },
              { label: 'End' },
            ],
          },
        },
        {
          name: 'a node label',
          props: {
            items: [{ label: { $nodes: [{ tag: 'strong', children: ['12'] }] } }, { label: 'End' }],
          },
        },
        {
          name: 'className and data-mol-id',
          props: { items: linked, className: 'parity-token', dataMolId: 'bc-x' },
        },
        {
          name: 'items change',
          props: { items: two },
          interactions: [
            {
              type: 'props',
              props: {
                items: [
                  { label: 'Docs', to: '/docs' },
                  { label: 'Guide', to: '/docs/guide' },
                  { label: 'Routing' },
                ],
              },
            },
          ],
        },
        {
          name: 'className and data-mol-id change',
          props: { items: two, className: 'parity-token', dataMolId: 'bc-x' },
          interactions: [
            { type: 'props', props: { className: 'parity-other', dataMolId: 'bc-y' } },
          ],
        },
      ],
      keyedLists: [{ prop: 'items', selector: 'nav > span' }],
    },
  ],
}
