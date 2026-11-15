/**
 * `@molecule/app-wiki-page-header-react` cases: the breadcrumb, title and
 * meta row (version, updated time/by, tags), the Edit/History buttons and
 * the extra-actions slot.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const crumb = [{ tag: 'nav', attrs: { 'data-crumb': '' }, children: ['Docs / Guides'] }]
const tags = [
  { tag: 'span', attrs: { 'data-tag': '' }, children: ['guide'] },
  { tag: 'span', attrs: { 'data-tag': '' }, children: ['setup'] },
]
const extra = [{ tag: 'span', attrs: { 'data-extra': '' }, children: ['Watch'] }]

/** `@molecule/app-wiki-page-header-react`. */
export const wikiPageHeaderFeature: FeatureCases = {
  package: '@molecule/app-wiki-page-header-react',
  families: [
    {
      component: 'WikiPageHeader',
      cases: [
        {
          name: 'everything',
          props: {
            title: 'Getting Started',
            version: 'v23',
            updatedAt: '2 days ago',
            updatedBy: 'Jane',
            className: 'parity-token',
          },
          slots: { breadcrumb: crumb, tags, extraActions: extra },
          callbacks: ['onEdit', 'onHistory'],
        },
        { name: 'title only', props: { title: 'Getting Started' } },
        { name: 'node title', slots: { title: [{ tag: 'strong', children: ['Project Alpha'] }] } },
        { name: 'breadcrumb', props: { title: 'T' }, slots: { breadcrumb: crumb } },
        {
          name: 'meta strings',
          props: {
            title: 'T',
            version: 'rev. 2025-04-12',
            updatedAt: 'just now',
            updatedBy: 'Ada',
          },
        },
        { name: 'tags', props: { title: 'T' }, slots: { tags } },
        { name: 'extraActions', props: { title: 'T' }, slots: { extraActions: extra } },
        { name: 'edit button only', props: { title: 'T' }, callbacks: ['onEdit'] },
        { name: 'history button only', props: { title: 'T' }, callbacks: ['onHistory'] },
        {
          name: 'empty meta strings render no meta',
          props: { title: 'T', version: '', updatedAt: '', updatedBy: '' },
        },
        {
          name: 'the edit button calls onEdit',
          props: { title: 'T' },
          callbacks: ['onEdit', 'onHistory'],
          interactions: [{ type: 'click', selector: 'header > div > div > button:nth-of-type(1)' }],
        },
        {
          name: 'the history button calls onHistory',
          props: { title: 'T' },
          callbacks: ['onEdit', 'onHistory'],
          interactions: [{ type: 'click', selector: 'header > div > div > button:nth-of-type(2)' }],
        },
        {
          name: 'title changes',
          props: { title: 'Getting Started' },
          interactions: [{ type: 'props', props: { title: 'Advanced Setup' } }],
        },
        {
          name: 'version and className change',
          props: { title: 'T', version: 'v23', className: 'parity-token' },
          interactions: [{ type: 'props', props: { version: 'v24', className: 'parity-other' } }],
        },
        {
          name: 'updatedAt removed on change',
          props: { title: 'T', updatedAt: '2 days ago' },
          interactions: [{ type: 'props', props: { updatedAt: null } }],
        },
        {
          name: 'updatedAt appears on change',
          props: { title: 'T' },
          interactions: [{ type: 'props', props: { updatedAt: 'today' } }],
        },
        {
          name: 'updatedBy appears on change',
          props: { title: 'T' },
          interactions: [{ type: 'props', props: { updatedBy: 'Sam' } }],
        },
      ],
    },
  ],
}
