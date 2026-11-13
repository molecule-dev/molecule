/**
 * PageHeader parity cases: title area with breadcrumbs, description, actions.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** PageHeader: title, description, actions slot, breadcrumb trail, overrides. */
export const pageHeaderCases: UIComponentCases = {
  component: 'PageHeader',
  keyedLists: [
    { prop: 'breadcrumbs', selector: 'nav a, nav span', caseName: 'breadcrumbs with links' },
  ],
  cases: [
    { name: 'title only', props: { title: 'Dashboard' } },
    {
      name: 'title and description',
      props: { title: 'Dashboard', description: 'Traffic over the last 30 days.' },
    },
    {
      name: 'title with actions',
      props: { title: 'Projects' },
      slots: {
        actions: [
          { component: 'Button', props: { variant: 'outline', size: 'sm' }, children: ['Export'] },
          { component: 'Button', props: { size: 'sm' }, children: ['New project'] },
        ],
      },
    },
    {
      name: 'breadcrumbs without links',
      props: { title: 'Reports', breadcrumbs: [{ label: 'Home' }, { label: 'Reports' }] },
    },
    {
      name: 'breadcrumbs with links',
      props: {
        title: 'Q3 revenue',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'Reports', href: '/reports' },
          { label: 'Q3 revenue' },
        ],
      },
    },
    {
      name: 'empty breadcrumbs renders no nav',
      props: { title: 'Settings', breadcrumbs: [] },
    },
    {
      name: 'breadcrumbs, description and actions combined',
      props: {
        title: 'Dataset',
        description: 'Monthly aggregates.',
        breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Datasets' }],
      },
      slots: { actions: [{ component: 'Button', props: { size: 'sm' }, children: ['Refresh'] }] },
    },
    {
      name: 'automationId, className, style and testId',
      props: {
        title: 'Billing',
        automationId: 'billing-header',
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'billing-header',
      },
    },
  ],
}
