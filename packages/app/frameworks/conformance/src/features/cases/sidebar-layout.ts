/**
 * `@molecule/app-sidebar-layout-react` cases: the brand link, the vertical nav
 * (idle and active items, with and without icons, longest-prefix match), the
 * bottom user-menu / theme-toggle slots, the stack-agnostic sidebar width and
 * the routed content area.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Two icons, exercising the optional `icon` field of a nav item. */
const withIcons = [
  { to: '/dashboard', key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/projects', key: 'projects', icon: 'folder', label: 'Projects' },
  { to: '/settings', key: 'settings', icon: 'settings', label: 'Settings' },
]

/** Two items without icons (the `icon` branch left out). */
const plainItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/settings', key: 'settings', label: 'Settings' },
]

/** A parent and its more specific child, both matching `/docs/endpoints/list`. */
const nestedItems = [
  { to: '/docs', key: 'docs', icon: 'menu_book', label: 'Docs' },
  { to: '/docs/endpoints', key: 'endpoints', icon: 'api', label: 'Endpoints' },
  { to: '/changelog', key: 'changelog', icon: 'history', label: 'Changelog' },
]

/** `@molecule/app-sidebar-layout-react`. */
export const sidebarLayoutFeature: FeatureCases = {
  package: '@molecule/app-sidebar-layout-react',
  families: [
    {
      component: 'SidebarLayout',
      cases: [
        {
          name: 'defaults: brand, plain nav items and an empty content area',
          props: { appName: 'Acme', navItems: plainItems },
        },
        {
          name: 'no children renders the routed page in main',
          props: { appName: 'Acme', navItems: plainItems },
          context: { route: '/dashboard', routedPage: 'Routed page' },
        },
        {
          name: 'children take the place of the routed page',
          props: { appName: 'Acme', navItems: plainItems },
          context: { route: '/dashboard', routedPage: 'Routed page' },
          children: [{ tag: 'p', children: ['Page body'] }],
        },
        {
          name: 'icons and a nested route',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/projects/settings' },
        },
        {
          name: 'the most specific matching item wins',
          props: { appName: 'Acme', navItems: nestedItems },
          context: { route: '/docs/endpoints/list' },
        },
        {
          name: 'the exact route marks its item active',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/settings' },
        },
        {
          name: 'no nav item matches the current route',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/elsewhere/deep' },
        },
        {
          name: 'a custom logo path, nav label, classes and id',
          props: {
            appName: 'Acme',
            logoTo: '/home',
            navAriaLabel: 'Sidebar nav',
            className: 'parity-token',
            dataMolId: 'sbl-x',
            navItems: withIcons,
          },
        },
        {
          name: 'no nav items',
          props: { appName: 'Acme', navItems: [] },
        },
        {
          name: 'only the user menu slot',
          props: { appName: 'Acme', navItems: plainItems },
          slots: {
            userMenu: [{ tag: 'button', attrs: { type: 'button' }, children: ['Ada'] }],
          },
        },
        {
          name: 'only the theme toggle slot',
          props: { appName: 'Acme', navItems: plainItems },
          slots: {
            themeToggle: [
              { tag: 'button', attrs: { type: 'button', 'aria-label': 'Theme' }, children: ['☾'] },
            ],
          },
        },
        {
          name: 'both bottom slots',
          props: { appName: 'Acme', navItems: plainItems },
          slots: {
            userMenu: [{ tag: 'span', children: ['Ada'] }],
            themeToggle: [{ tag: 'span', attrs: { 'data-theme': '' }, children: ['☀'] }],
          },
        },
        {
          name: 'the sm width preset',
          props: { appName: 'Acme', navItems: plainItems, sidebarWidth: 'sm' },
        },
        {
          name: 'the lg width preset',
          props: { appName: 'Acme', navItems: plainItems, sidebarWidth: 'lg' },
        },
        {
          name: 'an explicit pixel width',
          props: { appName: 'Acme', navItems: plainItems, sidebarWidth: 300 },
        },
        {
          name: 'the deprecated width class is parsed to pixels',
          props: { appName: 'Acme', navItems: plainItems, sidebarWidthClass: 'w-64' },
        },
        {
          name: 'a fractional legacy width class',
          props: { appName: 'Acme', navItems: plainItems, sidebarWidthClass: 'w-62.5' },
        },
        {
          name: 'an unrecognized legacy width class falls back to the default',
          props: { appName: 'Acme', navItems: plainItems, sidebarWidthClass: 'w-full' },
        },
        {
          name: 'sidebarWidth takes precedence over the deprecated class',
          props: {
            appName: 'Acme',
            navItems: plainItems,
            sidebarWidth: 'sm',
            sidebarWidthClass: 'w-64',
          },
        },
        {
          name: 'the width changes',
          props: { appName: 'Acme', navItems: plainItems, sidebarWidth: 'sm' },
          interactions: [
            { type: 'props', props: { sidebarWidth: 'lg' } },
            { type: 'props', props: { sidebarWidth: 320 } },
            { type: 'props', props: { sidebarWidth: undefined, sidebarWidthClass: 'w-52' } },
          ],
        },
        {
          name: 'the brand link navigates in-app',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/reports' },
          interactions: [{ type: 'click', selector: 'aside > a' }],
        },
        {
          name: 'the brand link on its own route adds the top fragment',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/' },
          interactions: [{ type: 'click', selector: 'aside > a' }],
        },
        {
          name: 'a nav item navigates and becomes active',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/dashboard' },
          interactions: [{ type: 'click', selector: 'nav a:nth-child(2)' }],
        },
        {
          name: 'a same-route nav click still changes the URL',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/projects' },
          interactions: [{ type: 'click', selector: 'nav a:nth-child(2)' }],
        },
        {
          name: 'modified clicks on a link are left to the browser',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/dashboard' },
          interactions: [
            { type: 'click', selector: 'nav a:nth-child(2)', modifiers: { ctrlKey: true } },
            { type: 'click', selector: 'nav a:nth-child(2)', modifiers: { metaKey: true } },
            { type: 'click', selector: 'nav a:nth-child(2)', modifiers: { shiftKey: true } },
            { type: 'click', selector: 'nav a:nth-child(2)', modifiers: { altKey: true } },
          ],
        },
        {
          name: 'a router navigation moves the active item',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/dashboard' },
          interactions: [{ type: 'navigate', to: '/projects' }],
        },
        {
          name: 'the app name and the items change',
          props: { appName: 'Acme', navItems: plainItems },
          interactions: [
            {
              type: 'props',
              props: {
                appName: 'Acme Cloud',
                navItems: [
                  { to: '/dashboard', key: 'dashboard', icon: 'dashboard', label: 'Overview' },
                  { to: '/billing', key: 'billing', icon: 'credit_card', label: 'Billing' },
                ],
              },
            },
          ],
        },
        {
          name: 'the nav label, classes and id change',
          props: { appName: 'Acme', navItems: plainItems },
          interactions: [
            {
              type: 'props',
              props: { navAriaLabel: 'Sidebar', className: 'parity-token', dataMolId: 'sbl-y' },
            },
          ],
        },
      ],
    },
  ],
}
