/**
 * EmptyState parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** EmptyState: title/description, icon, action slot, automationId, passthrough. */
export const emptyStateCases: UIComponentCases = {
  component: 'EmptyState',
  cases: [
    { name: 'defaults', props: { title: 'No projects yet' } },
    {
      name: 'with description',
      props: { title: 'No projects yet', description: 'Create your first project to get started.' },
    },
    {
      name: 'icon',
      props: { title: 'No projects yet' },
      slots: { icon: [{ tag: 'svg', attrs: { viewBox: '0 0 24 24', 'data-icon': 'folder' } }] },
    },
    {
      name: 'action',
      props: { title: 'No projects yet' },
      slots: { action: [{ component: 'Button', children: ['Create project'] }] },
    },
    {
      name: 'icon and action together',
      props: { title: 'No projects yet', description: 'Nothing to show.' },
      slots: {
        icon: [{ tag: 'svg', attrs: { viewBox: '0 0 24 24', 'data-icon': 'folder' } }],
        action: [{ component: 'Button', props: { variant: 'outline' }, children: ['New project'] }],
      },
    },
    {
      name: 'automationId maps to data-mol-id',
      props: { title: 'No projects yet', automationId: 'projects-empty' },
    },
    {
      name: 'className, style and testId',
      props: {
        title: 'No projects yet',
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'empty',
      },
    },
  ],
}
