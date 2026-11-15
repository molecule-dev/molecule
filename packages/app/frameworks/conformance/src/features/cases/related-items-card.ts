/**
 * `@molecule/app-related-items-card-react` cases: the titled Card with a
 * header (icon, title, actions, "View all" link), a list of rendered items and
 * an empty state, in every prop branch.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Two items, each rendering its name and index through the render function. */
const items = [{ name: 'Deal A' }, { name: 'Deal B' }]

/** The required render function: one span per item, carrying the item and its index. */
const renderItem = {
  $fn: 'renderItem',
  nodes: [
    {
      tag: 'span',
      attrs: { 'data-item': '{0.name}', 'data-index': '{1}' },
      children: ['{0.name}'],
    },
  ],
}

/** A leading icon, the way a caller fills the `icon` slot. */
const icon = [{ tag: 'span', attrs: { 'data-icon': '' }, children: ['◆'] }]

/** A right-aligned header action, the way a caller fills the `headerActions` slot. */
const headerActions = [
  { tag: 'button', attrs: { 'data-actions': '', type: 'button' }, children: ['Add'] },
]

/** The empty state, the way a caller fills the `emptyState` slot. */
const emptyState = [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['No related deals yet.'] }]

/** `@molecule/app-related-items-card-react`. */
export const relatedItemsCardFeature: FeatureCases = {
  package: '@molecule/app-related-items-card-react',
  families: [
    {
      component: 'RelatedItemsCard',
      keyedLists: [{ prop: 'items', selector: 'li' }],
      cases: [
        { name: 'title and items', props: { title: 'Deals', items, renderItem } },
        {
          name: 'icon and header actions',
          props: { title: 'Deals', items, renderItem },
          slots: { icon, headerActions },
        },
        {
          name: 'view all link',
          props: { title: 'Deals', items, renderItem, viewAllHref: '/deals' },
        },
        {
          name: 'icon, header actions and view all',
          props: { title: 'Deals', items, renderItem, viewAllHref: '/deals' },
          slots: { icon, headerActions },
        },
        {
          name: 'empty list with an empty state',
          props: { title: 'Deals', items: [], renderItem },
          slots: { emptyState },
        },
        {
          name: 'empty list without an empty state',
          props: { title: 'Deals', items: [], renderItem },
        },
        {
          name: 'clickable rows call onItemClick',
          props: { title: 'Deals', items, renderItem },
          callbacks: ['onItemClick'],
          interactions: [
            { type: 'click', selector: 'li:nth-child(1)' },
            { type: 'click', selector: 'li:nth-child(2)' },
          ],
        },
        {
          name: 'class and mol id',
          props: {
            title: 'Deals',
            items,
            renderItem,
            className: 'parity-token',
            dataMolId: 'related-items',
          },
        },
        {
          name: 'node title and node empty state',
          props: { items: [], renderItem },
          slots: {
            title: [{ tag: 'strong', children: ['Deals'] }],
            emptyState,
          },
        },
        {
          name: 'empty title text',
          props: { title: '', items, renderItem },
        },
        {
          name: 'falsy view all href renders no link',
          props: { title: 'Deals', items, renderItem, viewAllHref: '' },
        },
        {
          name: 'props change swaps title and items',
          props: { title: 'Deals', items, renderItem },
          interactions: [
            { type: 'props', props: { title: 'Contacts', items: [{ name: 'Note A' }] } },
          ],
        },
        {
          name: 'props change empties the list',
          props: { title: 'Deals', items, renderItem },
          slots: { emptyState },
          interactions: [{ type: 'props', props: { items: [] } }],
        },
        {
          name: 'props change adds the view all link',
          props: { title: 'Deals', items, renderItem },
          interactions: [{ type: 'props', props: { viewAllHref: '/all' } }],
        },
        {
          name: 'props change turns the rows clickable',
          props: { title: 'Deals', items, renderItem },
          callbacks: ['onItemClick'],
          interactions: [
            { type: 'props', props: { onItemClick: { $callback: 'onItemClick' } } },
            { type: 'click', selector: 'li:nth-child(1)' },
          ],
        },
      ],
    },
  ],
}
