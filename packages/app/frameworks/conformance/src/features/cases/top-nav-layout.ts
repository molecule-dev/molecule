/**
 * `@molecule/app-top-nav-layout-react` cases: the brand link, the horizontal
 * nav (idle and active items, with and without icons), the user-menu slot and
 * the routed content area.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Two icons, exercising the optional `icon` field of a nav item. */
const withIcons = [
  { to: '/dashboard', key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', icon: 'bar_chart', label: 'Reports' },
]

/** Two items without icons (the `icon` branch left out). */
const plainItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

/** `@molecule/app-top-nav-layout-react`. */
export const topNavLayoutFeature: FeatureCases = {
  package: '@molecule/app-top-nav-layout-react',
  families: [
    {
      component: 'TopNavLayout',
      cases: [
        {
          name: 'defaults: brand, plain nav items and an empty content area',
          props: { appName: 'Acme', navItems: plainItems },
        },
        {
          name: 'icons and a nested route',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/dashboard/settings' },
        },
        {
          name: 'the exact route marks its item active',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/reports' },
        },
        {
          name: 'a custom logo path, nav label, classes, id and user menu',
          props: {
            appName: 'Acme',
            logoTo: '/home',
            navAriaLabel: 'Top nav',
            className: 'parity-token',
            dataMolId: 'tnl-x',
            navItems: withIcons,
          },
          slots: {
            userMenu: [{ tag: 'button', attrs: { type: 'button' }, children: ['Ada'] }],
          },
        },
        {
          name: 'no nav items',
          props: { appName: 'Acme', navItems: [] },
        },
        {
          name: 'the brand link navigates in-app',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/reports' },
          interactions: [{ type: 'click', selector: 'header > div > a' }],
        },
        {
          name: 'a nav item navigates and becomes active',
          props: { appName: 'Acme', navItems: withIcons },
          context: { route: '/dashboard' },
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
          interactions: [{ type: 'navigate', to: '/reports' }],
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
      ],
    },
  ],
}
