/**
 * `SidebarTabs` cases: both tabs' rendered states, the `onTabChange` clicks,
 * the `activeTab` prop as the single source of the selection, the `className`
 * pass-through, the content area with and without children, and the labels
 * following a locale switch.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `SidebarTabs`. */
export const sidebarTabsCases: FeatureComponentCases = {
  component: 'SidebarTabs',
  cases: [
    {
      name: 'the files tab',
      props: { activeTab: 'files' },
      callbacks: ['onTabChange'],
      children: ['tab content'],
    },
    {
      name: 'the search tab',
      props: { activeTab: 'search' },
      callbacks: ['onTabChange'],
      children: ['tab content'],
    },
    {
      name: 'no children leaves the content area empty',
      props: { activeTab: 'files' },
      callbacks: ['onTabChange'],
    },
    {
      name: 'a click on a tab reports it',
      props: { activeTab: 'files' },
      callbacks: ['onTabChange'],
      children: ['tab content'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="sidebar-tab-search"]' },
        { type: 'click', selector: '[data-mol-id="sidebar-tab-files"]' },
      ],
    },
    {
      name: 'the active tab follows the prop, not the click',
      props: { activeTab: 'files' },
      callbacks: ['onTabChange'],
      children: ['tab content'],
      interactions: [
        { type: 'props', props: { activeTab: 'search' } },
        { type: 'props', props: { activeTab: 'files' } },
      ],
    },
    {
      name: 'the className lands on the root',
      props: { activeTab: 'search', className: 'parity-token' },
      callbacks: ['onTabChange'],
      children: ['tab content'],
      interactions: [{ type: 'props', props: { className: 'parity-token-wide' } }],
    },
    {
      name: 'a locale switch re-renders every label through i18n',
      props: { activeTab: 'files' },
      callbacks: ['onTabChange'],
      children: ['tab content'],
      context: {
        translations: {
          fr: {
            ide: {
              sidebar: {
                tabs: 'Barre latérale',
                files: 'Explorateur',
                search: 'Rechercher',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
