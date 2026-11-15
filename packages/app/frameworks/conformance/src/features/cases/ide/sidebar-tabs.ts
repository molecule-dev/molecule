/**
 * `SidebarTabs` cases.
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
  ],
}
