/**
 * `@molecule/app-settings-container-react` cases: the two-column settings
 * layout, its content wrapper, the Card-wrapped section and the controlled
 * side-nav with every item, icon, label, footer and `onSelect` branch.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Two plain nav items. */
const items = [
  { id: 'profile', label: 'Profile' },
  { id: 'billing', label: 'Billing' },
]

/** The same two items with node labels and icons. */
const nodeItems = [
  {
    id: 'profile',
    label: {
      $nodes: [{ tag: 'strong', attrs: { 'data-label': 'profile' }, children: ['Profile'] }],
    },
    icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'user' } }] },
  },
  {
    id: 'billing',
    label: { $nodes: [{ tag: 'em', attrs: { 'data-label': 'billing' }, children: ['Billing'] }] },
    icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'card' } }] },
  },
]

/** A sidebar node, as a caller would pass one. */
const sidebar = [{ tag: 'nav', attrs: { 'data-sidebar': '' }, children: ['Profile'] }]
/** A content node. */
const content = [{ tag: 'p', attrs: { 'data-body': '' }, children: ['Form fields'] }]

/** `@molecule/app-settings-container-react`. */
export const settingsContainerFeature: FeatureCases = {
  package: '@molecule/app-settings-container-react',
  families: [
    {
      component: 'SettingsLayout',
      cases: [
        {
          name: 'sidebar and content',
          slots: { sidebar },
          children: content,
        },
        {
          name: 'header, sidebar and content',
          slots: {
            header: [{ tag: 'header', attrs: { 'data-header': '' }, children: ['Settings'] }],
            sidebar,
          },
          children: content,
        },
        {
          name: 'classes and a data-mol-id',
          props: { className: 'parity-token', dataMolId: 'settings-x' },
          slots: { sidebar },
          children: content,
        },
        {
          name: 'no header and no sidebar node',
          children: content,
        },
        {
          name: 'header as a node prop',
          props: {
            header: {
              $nodes: [{ tag: 'strong', attrs: { 'data-header': '' }, children: ['Settings'] }],
            },
          },
          slots: { sidebar },
          children: content,
        },
        {
          name: 'classes change on a later props step',
          props: { className: 'parity-token', dataMolId: 'settings-x' },
          slots: { sidebar },
          children: content,
          interactions: [{ type: 'props', props: { className: 'next-token', dataMolId: 'y' } }],
        },
      ],
    },
    {
      component: 'SettingsContent',
      cases: [
        { name: 'children', children: content },
        { name: 'no children' },
        { name: 'className', props: { className: 'parity-token' }, children: content },
        {
          name: 'className changes on a later props step',
          props: { className: 'parity-token' },
          children: content,
          interactions: [{ type: 'props', props: { className: 'next-token' } }],
        },
      ],
    },
    {
      component: 'SettingsSection',
      cases: [
        { name: 'title only', props: { title: 'Profile' } },
        {
          name: 'title and description',
          props: { title: 'Profile', description: 'Update your display name.' },
        },
        {
          name: 'title, description, body and a footer action',
          props: { title: 'Profile', description: 'Update your display name.' },
          slots: {
            footer: [
              { tag: 'button', attrs: { type: 'button', 'data-save': '' }, children: ['Save'] },
            ],
          },
          children: content,
        },
        {
          name: 'node title and description',
          slots: {
            title: [{ tag: 'strong', attrs: { 'data-title': '' }, children: ['Profile'] }],
            description: [{ tag: 'em', attrs: { 'data-desc': '' }, children: ['Public'] }],
          },
          children: content,
        },
        {
          name: 'title as a node prop',
          props: {
            title: {
              $nodes: [{ tag: 'span', attrs: { 'data-title': '' }, children: ['Profile'] }],
            },
          },
          children: content,
        },
        {
          name: 'footer as text',
          props: { title: 'Profile', footer: 'Saved' },
        },
        {
          name: 'className and a data-mol-id',
          props: { title: 'Profile', className: 'parity-token', dataMolId: 'section-x' },
          children: content,
        },
        {
          name: 'an empty title still renders the heading',
          props: { title: '' },
        },
        {
          name: 'a description appears on a later props step',
          props: { title: 'Profile' },
          interactions: [{ type: 'props', props: { description: 'Now described.' } }],
        },
        {
          name: 'a description disappears on a later props step',
          props: { title: 'Profile', description: 'Described.' },
          interactions: [{ type: 'props', props: { description: undefined } }],
        },
        {
          name: 'a footer disappears on a later props step',
          props: { title: 'Profile', footer: 'Saved' },
          interactions: [{ type: 'props', props: { footer: undefined } }],
        },
        {
          name: 'classes change on a later props step',
          props: { title: 'Profile', className: 'parity-token', dataMolId: 'section-x' },
          interactions: [{ type: 'props', props: { className: 'next-token', dataMolId: 'y' } }],
        },
      ],
    },
    {
      component: 'SettingsSidebar',
      cases: [
        {
          name: 'two items with the first active',
          props: { items, activeId: 'profile' },
        },
        {
          name: 'the active item moves with activeId',
          props: { items, activeId: 'profile' },
          interactions: [{ type: 'props', props: { activeId: 'billing' } }],
        },
        {
          name: 'node labels and icons',
          props: { items: nodeItems, activeId: 'billing' },
        },
        {
          name: 'a footer inside the sidebar',
          props: { items, activeId: 'profile' },
          slots: {
            footer: [
              {
                tag: 'button',
                attrs: { type: 'button', 'data-signout': '' },
                children: ['Sign out'],
              },
            ],
          },
        },
        {
          name: 'className',
          props: { items, activeId: 'profile', className: 'parity-token' },
        },
        {
          name: 'no items',
          props: { items: [], activeId: 'profile' },
        },
        {
          name: 'items change on a later props step',
          props: { items, activeId: 'profile' },
          interactions: [
            { type: 'props', props: { items: [{ id: 'security', label: 'Security' }] } },
          ],
        },
        {
          name: 'each item calls onSelect with its id',
          props: { items, activeId: 'profile' },
          callbacks: ['onSelect'],
          interactions: [
            { type: 'click', selector: 'nav > button:nth-of-type(2)' },
            { type: 'click', selector: 'nav > button:nth-of-type(1)' },
          ],
        },
        {
          name: 'clicking the active item still calls onSelect',
          props: { items, activeId: 'profile' },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: 'nav > button:nth-of-type(1)' }],
        },
        {
          name: 'an item click does not change the active item by itself',
          props: { items, activeId: 'profile' },
          callbacks: ['onSelect'],
          interactions: [
            { type: 'click', selector: 'nav > button:nth-of-type(2)' },
            { type: 'click', selector: 'nav > button:nth-of-type(2)' },
          ],
        },
      ],
      keyedLists: [
        {
          prop: 'items',
          selector: 'nav > button',
          caseName: 'two items with the first active',
        },
      ],
    },
  ],
}
