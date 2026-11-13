/**
 * ResponsiveAppShell parity cases: the responsive shell root plus — through
 * compositions — its TopBar, Sidebar, Drawer and Content sub-components.
 *
 * The sub-components read a context only the root provides (`<TopBar>` outside
 * `<ResponsiveAppShell>` throws by design), so every sub-component prop is
 * exercised as a child of the root; see the layout report for the case-language
 * gap (`mountInside`) that blocks standalone sub-component families.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const navLinks = [
  { tag: 'a', attrs: { href: '/dashboard' }, children: ['Dashboard'] },
  { tag: 'a', attrs: { href: '/projects' }, children: ['Projects'] },
]

const fullShell = [
  { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
  { component: 'ResponsiveAppShellSidebar', children: navLinks },
  { component: 'ResponsiveAppShellDrawer', children: navLinks },
  { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
]

const mobileShell = [
  { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
  { component: 'ResponsiveAppShellDrawer', children: navLinks },
  { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
]

/** ResponsiveAppShell: desktop/mobile shells, drawer dialog behavior, widths, slots. */
export const responsiveAppShellCases: UIComponentCases = {
  component: 'ResponsiveAppShell',
  cases: [
    {
      name: 'desktop full composition',
      children: fullShell,
    },
    {
      name: 'desktop sidebar with footer',
      children: [
        {
          component: 'ResponsiveAppShellSidebar',
          children: navLinks,
          slots: { footer: ['v1.2.3'] },
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'desktop sidebar width sm',
      props: { sidebarWidth: 'sm' },
      children: [
        { component: 'ResponsiveAppShellSidebar', children: navLinks },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'desktop sidebar width lg',
      props: { sidebarWidth: 'lg' },
      children: [
        { component: 'ResponsiveAppShellSidebar', children: navLinks },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'desktop sidebar width number',
      props: { sidebarWidth: 300 },
      children: [
        { component: 'ResponsiveAppShellSidebar', children: navLinks },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'sidebar custom nav label',
      children: [
        {
          component: 'ResponsiveAppShellSidebar',
          props: { navLabel: 'Main menu' },
          children: navLinks,
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'sidebar dataMolId, testId and className',
      children: [
        {
          component: 'ResponsiveAppShellSidebar',
          props: { dataMolId: 'side-rail', testId: 'rail', className: 'parity-token' },
          children: navLinks,
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'topbar mobileOnly renders nothing on desktop',
      children: [
        {
          component: 'ResponsiveAppShellTopBar',
          props: { mobileOnly: true },
          slots: { brand: ['Timetrack'] },
        },
        { component: 'ResponsiveAppShellSidebar', children: navLinks },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'topbar with brand and actions on desktop',
      children: [
        {
          component: 'ResponsiveAppShellTopBar',
          slots: {
            brand: ['Timetrack'],
            actions: [{ tag: 'button', attrs: { type: 'button' }, children: ['New'] }],
          },
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'topbar without brand or actions',
      viewportWidth: 375,
      children: [
        { component: 'ResponsiveAppShellTopBar' },
        { component: 'ResponsiveAppShellDrawer', children: navLinks },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'topbar dataMolId, testId and className',
      viewportWidth: 375,
      children: [
        {
          component: 'ResponsiveAppShellTopBar',
          props: { dataMolId: 'bar', testId: 'bar', className: 'parity-token' },
          slots: { brand: ['Timetrack'] },
        },
        { component: 'ResponsiveAppShellDrawer', children: navLinks },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'mobile full composition closed',
      viewportWidth: 375,
      children: mobileShell,
    },
    {
      name: 'mobile without drawer composes no trigger',
      viewportWidth: 375,
      children: [
        { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'desktop without drawer composes no trigger',
      children: [
        { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      name: 'mobile drawer opens via trigger',
      viewportWidth: 375,
      children: mobileShell,
      interactions: [{ type: 'click', selector: '[data-mol-id="shell-drawer-open"]' }],
    },
    {
      name: 'mobile drawer closes on escape',
      viewportWidth: 375,
      children: mobileShell,
      interactions: [
        { type: 'click', selector: '[data-mol-id="shell-drawer-open"]' },
        { type: 'keydown', selector: '[role="dialog"]', key: 'Escape' },
      ],
    },
    {
      name: 'mobile drawer closes on backdrop click',
      viewportWidth: 375,
      children: mobileShell,
      interactions: [
        { type: 'click', selector: '[data-mol-id="shell-drawer-open"]' },
        { type: 'click', selector: '[role="dialog"]' },
        { type: 'click', selector: '[data-mol-id="shell-drawer-open"]' },
        { type: 'click', selector: '[style*="z-index: 41"]' },
      ],
    },
    {
      name: 'mobile drawer closes via close button',
      viewportWidth: 375,
      children: mobileShell,
      interactions: [
        { type: 'click', selector: '[data-mol-id="shell-drawer-open"]' },
        { type: 'click', selector: '[data-mol-id="shell-drawer-close"]' },
      ],
    },
    {
      name: 'mobile drawer with header and close button',
      viewportWidth: 375,
      children: [
        { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
        {
          component: 'ResponsiveAppShellDrawer',
          slots: { header: ['Timetrack'] },
          children: navLinks,
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
      interactions: [{ type: 'click', selector: '[data-mol-id="shell-drawer-open"]' }],
    },
    {
      name: 'mobile drawer without close button',
      viewportWidth: 375,
      children: [
        { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
        {
          component: 'ResponsiveAppShellDrawer',
          props: { showCloseButton: false },
          slots: { header: ['Timetrack'] },
          children: navLinks,
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
      interactions: [{ type: 'click', selector: '[data-mol-id="shell-drawer-open"]' }],
    },
    {
      name: 'mobile drawer with footer',
      viewportWidth: 375,
      children: [
        { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
        {
          component: 'ResponsiveAppShellDrawer',
          children: navLinks,
          slots: { footer: ['Signed in as Ada'] },
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
      interactions: [{ type: 'click', selector: '[data-mol-id="shell-drawer-open"]' }],
    },
    {
      name: 'mobile drawer custom nav label',
      viewportWidth: 375,
      children: [
        { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
        {
          component: 'ResponsiveAppShellDrawer',
          props: { navLabel: 'Main menu' },
          children: navLinks,
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
      interactions: [{ type: 'click', selector: '[data-mol-id="shell-drawer-open"]' }],
    },
    {
      name: 'mobile drawer id and testId overrides',
      viewportWidth: 375,
      children: [
        { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
        {
          component: 'ResponsiveAppShellDrawer',
          props: { dataMolId: 'nav-drawer', closeDataMolId: 'nav-drawer-x', testId: 'nav-drawer' },
          children: navLinks,
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
      interactions: [{ type: 'click', selector: '[data-mol-id="shell-drawer-open"]' }],
    },
    {
      name: 'mobile drawer className and root width',
      viewportWidth: 375,
      props: { sidebarWidth: 300 },
      children: [
        { component: 'ResponsiveAppShellTopBar', slots: { brand: ['Timetrack'] } },
        {
          component: 'ResponsiveAppShellDrawer',
          props: { className: 'parity-token' },
          children: navLinks,
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
      interactions: [{ type: 'click', selector: '[data-mol-id="shell-drawer-open"]' }],
    },
    {
      name: 'content overrides',
      children: [
        { component: 'ResponsiveAppShellSidebar', children: navLinks },
        {
          component: 'ResponsiveAppShellContent',
          props: {
            dataMolId: 'page',
            testId: 'page',
            className: 'parity-token',
            style: { padding: '16px' },
          },
          children: ['Routed page'],
        },
      ],
    },
    {
      name: 'root className and dataMolId',
      props: { className: 'parity-token', dataMolId: 'the-shell' },
      children: [{ component: 'ResponsiveAppShellContent', children: ['Routed page'] }],
    },
    {
      name: 'nav children mark the current item',
      children: [
        {
          component: 'ResponsiveAppShellSidebar',
          children: [
            {
              tag: 'a',
              attrs: { href: '/dashboard', 'aria-current': 'page' },
              children: ['Dashboard'],
            },
            { tag: 'a', attrs: { href: '/projects' }, children: ['Projects'] },
          ],
        },
        { component: 'ResponsiveAppShellContent', children: ['Routed page'] },
      ],
    },
    {
      // Focusing the trigger first makes it the opener the drawer must return
      // focus to when the route change closes it.
      name: 'mobile drawer closes on route change and restores focus',
      viewportWidth: 375,
      children: mobileShell,
      interactions: [
        { type: 'focus', selector: '[data-mol-id="shell-drawer-open"]' },
        { type: 'click', selector: '[data-mol-id="shell-drawer-open"]' },
        { type: 'navigate', to: '/elsewhere' },
      ],
    },
    {
      name: 'desktop breakpoint reads useIsDesktop as true',
      children: [
        {
          component: 'ResponsiveAppShellContent',
          children: [{ probe: 'useIsDesktop', value: true, label: 'desktop?' }],
        },
      ],
    },
    {
      name: 'mobile breakpoint reads useIsDesktop as false',
      viewportWidth: 375,
      children: [
        {
          component: 'ResponsiveAppShellContent',
          children: [{ probe: 'useIsDesktop', value: true, label: 'desktop?' }],
        },
      ],
    },
  ],
}
