/**
 * PageShell parity cases: authenticated page wrapper with sidebar and top bar.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const nav = [{ tag: 'a', attrs: { href: '/projects' }, children: ['Projects'] }]

/** PageShell: sidebar/topbar slots, collapsed state, toggle callback, overrides. */
export const pageShellCases: UIComponentCases = {
  component: 'PageShell',
  cases: [
    { name: 'content only', children: ['Main content'] },
    { name: 'with sidebar', slots: { sidebar: nav }, children: ['Main content'] },
    { name: 'with topbar', slots: { topbar: ['Timetrack'] }, children: ['Main content'] },
    {
      name: 'sidebar, topbar and content',
      slots: { sidebar: nav, topbar: [{ tag: 'header', children: ['Timetrack'] }] },
      children: ['Main content'],
    },
    {
      name: 'sidebar collapsed',
      props: { sidebarCollapsed: true },
      slots: { sidebar: nav },
      children: ['Main content'],
    },
    {
      name: 'toggle collapses via callback',
      props: { sidebarCollapsed: false },
      slots: { sidebar: nav },
      children: ['Main content'],
      callbacks: ['onSidebarToggle'],
      interactions: [{ type: 'click', selector: '[aria-label="Collapse sidebar"]' }],
    },
    {
      name: 'collapsed toggle expands via callback',
      props: { sidebarCollapsed: true },
      slots: { sidebar: nav },
      children: ['Main content'],
      callbacks: ['onSidebarToggle'],
      interactions: [{ type: 'click', selector: '[aria-label="Expand sidebar"]' }],
    },
    {
      name: 'no toggle button without onSidebarToggle',
      slots: { sidebar: nav },
      children: ['Main content'],
      interactions: [{ type: 'props', props: { sidebarCollapsed: true } }],
    },
    {
      name: 'automationId, className, style and testId',
      props: {
        automationId: 'app-shell',
        className: 'parity-token',
        style: { minHeight: '100vh' },
        testId: 'app-shell',
      },
      slots: { sidebar: nav, topbar: ['Timetrack'] },
      children: ['Main content'],
    },
    {
      name: 'element children',
      slots: { sidebar: nav },
      children: [{ tag: 'p', children: ['Signed-in area'] }],
    },
  ],
}
