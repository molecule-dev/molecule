/**
 * `@molecule/app-tab-filter-react` cases: the horizontally-scrolling pill-tab
 * row, its per-tab count badges and icons, the persistent collection default
 * tab, the scrollable/filled styles and the `onChange` callback.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const tabs = [
  { id: 'all', label: 'All', count: 42 },
  { id: 'open', label: 'Open', count: 8 },
  { id: 'closed', label: 'Closed', disabled: true },
]

const iconTabs = [
  {
    id: 'starred',
    label: 'Starred',
    icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'star' } }] },
    count: 3,
  },
  { id: 'all', label: 'All' },
]

const nodeTabs = [
  {
    id: 'alpha',
    label: { $nodes: [{ tag: 'strong', children: ['Alpha'] }] },
    icon: { $nodes: [{ tag: 'svg', attrs: { 'data-icon': 'alpha' }, children: [] }] },
  },
  { id: 'beta', label: { $nodes: [{ tag: 'em', children: ['Beta'] }] }, count: 2 },
]

const numbered = [
  { id: 'many', label: 'Many', count: 1234 },
  { id: 'none', label: 'None', count: 0 },
]

/** `@molecule/app-tab-filter-react`. */
export const tabFilterFeature: FeatureCases = {
  package: '@molecule/app-tab-filter-react',
  families: [
    {
      component: 'TabFilter',
      cases: [
        { name: 'three tabs with counts', props: { tabs, activeId: 'all' } },
        { name: 'the second tab active', props: { tabs, activeId: 'open' } },
        { name: 'an active id no tab has', props: { tabs, activeId: 'missing' } },
        {
          name: 'a tab without a count',
          props: {
            tabs: [
              { id: 'all', label: 'All', count: 42 },
              { id: 'open', label: 'Open' },
            ],
            activeId: 'all',
          },
        },
        { name: 'counts with grouping separators', props: { tabs: numbered, activeId: 'many' } },
        { name: 'tab icons', props: { tabs: iconTabs, activeId: 'starred' } },
        {
          name: 'node labels and icons',
          props: { tabs: nodeTabs, activeId: 'beta' },
        },
        {
          name: 'an empty label',
          props: {
            tabs: [
              { id: 'blank', label: '' },
              { id: 'open', label: 'Open', count: 1 },
            ],
            activeId: 'blank',
          },
        },
        { name: 'a disabled tab', props: { tabs, activeId: 'all' } },
        { name: 'no tabs', props: { tabs: [], activeId: 'all' } },
        { name: 'not scrollable', props: { tabs, activeId: 'all', scrollable: false } },
        { name: 'not filled', props: { tabs, activeId: 'open', filled: false } },
        {
          name: 'className passthrough',
          props: { tabs, activeId: 'all', className: 'parity-token' },
        },
        {
          name: 'clicking a tab calls onChange',
          props: { tabs, activeId: 'all' },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(2)' }],
        },
        {
          name: 'each tab calls with its own id',
          props: { tabs, activeId: 'all' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: '[role="tab"]:nth-of-type(2)' },
            { type: 'click', selector: '[role="tab"]:nth-of-type(3)' },
          ],
        },
        {
          name: 'a disabled tab does not call onChange',
          props: { tabs, activeId: 'all' },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(3)' }],
        },
        {
          name: 'the collection default tab is prepended',
          props: {
            tabs: [{ id: 'notes', label: 'Notes', count: 4 }],
            defaultTab: { id: 'all', label: 'All documents' },
            activeId: 'notes',
          },
        },
        {
          name: 'the default tab replaces a duplicate',
          props: {
            tabs,
            defaultTab: { id: 'all', label: 'All documents' },
            activeId: 'all',
          },
        },
        {
          name: 'a default tab without tabs',
          props: { tabs: [], defaultTab: { id: 'all', label: 'All documents' }, activeId: 'all' },
        },
        {
          name: 'the default tab calls onChange',
          props: {
            tabs: [{ id: 'drafts', label: 'Drafts' }],
            defaultTab: { id: 'all', label: 'All documents', count: 12 },
            activeId: 'drafts',
          },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(1)' }],
        },
        {
          name: 'the active tab changes',
          props: { tabs, activeId: 'all' },
          interactions: [{ type: 'props', props: { activeId: 'open' } }],
        },
        {
          name: 'the tabs change',
          props: { tabs, activeId: 'all' },
          interactions: [
            {
              type: 'props',
              props: { tabs: [{ id: 'docs', label: 'Docs', count: 5 }], activeId: 'docs' },
            },
          ],
        },
        {
          name: 'className and scrollable change',
          props: { tabs, activeId: 'all', className: 'parity-token' },
          interactions: [
            { type: 'props', props: { className: 'parity-other', scrollable: false } },
            { type: 'props', props: { scrollable: true } },
          ],
        },
        {
          name: 'filled changes',
          props: { tabs, activeId: 'all', filled: false },
          interactions: [{ type: 'props', props: { filled: true } }],
        },
        {
          name: 'a default tab appears on a later render',
          props: { tabs: [{ id: 'open', label: 'Open' }], activeId: 'open' },
          interactions: [
            {
              type: 'props',
              props: {
                tabs: [{ id: 'open', label: 'Open', count: 6 }],
                defaultTab: { id: 'all', label: 'All documents' },
              },
            },
          ],
        },
        {
          name: 'a default tab disappears on a later render',
          props: {
            tabs: [{ id: 'open', label: 'Open' }],
            defaultTab: { id: 'all', label: 'All documents' },
            activeId: 'open',
          },
          interactions: [{ type: 'props', props: { defaultTab: undefined } }],
        },
        {
          name: 'a count appears on a later render',
          props: { tabs: [{ id: 'all', label: 'All' }], activeId: 'all' },
          interactions: [
            { type: 'props', props: { tabs: [{ id: 'all', label: 'All', count: 7 }] } },
          ],
        },
        {
          name: 'a disabled tab is re-enabled on a later render',
          props: { tabs, activeId: 'closed' },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'props',
              props: { tabs: [tabs[0], tabs[1], { id: 'closed', label: 'Closed' }] },
            },
            { type: 'click', selector: '[role="tab"]:nth-of-type(3)' },
          ],
        },
      ],
      keyedLists: [{ prop: 'tabs', selector: '[role="tab"]' }],
    },
  ],
}
