/**
 * `@molecule/app-header-react` cases: brand link, the default theme toggle,
 * action slots, the fixed / static bar and the primary navigation landmark.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-header-react`. */
export const headerFeature: FeatureCases = {
  package: '@molecule/app-header-react',
  families: [
    {
      component: 'AppHeader',
      cases: [
        { name: 'name and the default theme toggle', props: { appName: 'Acme' } },
        {
          name: 'own logo, size and brand path',
          props: { appName: 'Acme', logoSrc: '/brand.png', logoSize: 40, brandTo: '/home' },
        },
        {
          name: 'actions and a user menu',
          props: { appName: 'Acme' },
          slots: {
            extraActions: [{ tag: 'button', attrs: { type: 'button' }, children: ['Help'] }],
            userMenu: [{ tag: 'button', attrs: { type: 'button' }, children: ['Ada'] }],
          },
        },
        {
          name: 'own theme toggle',
          props: { appName: 'Acme' },
          slots: { themeToggle: [{ tag: 'span', children: ['Theme'] }] },
        },
        { name: 'no theme toggle', props: { appName: 'Acme', themeToggle: null } },
        {
          name: 'static, with a className and an id',
          props: { appName: 'Acme', fixed: false, className: 'parity-token', dataMolId: 'top' },
        },
        {
          name: 'brand link goes home',
          props: { appName: 'Acme' },
          context: { route: '/settings' },
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          // A new-tab, new-window or download click is the browser's, as with react-router's Link.
          name: 'modified clicks on the brand link are left to the browser',
          props: { appName: 'Acme' },
          context: { route: '/settings' },
          interactions: [
            { type: 'click', selector: 'a', modifiers: { ctrlKey: true } },
            { type: 'click', selector: 'a', modifiers: { metaKey: true } },
            { type: 'click', selector: 'a', modifiers: { shiftKey: true } },
            { type: 'click', selector: 'a', modifiers: { altKey: true } },
          ],
        },
        {
          name: 'the default toggle switches the theme',
          props: { appName: 'Acme' },
          context: { theme: 'light' },
          interactions: [{ type: 'click', selector: 'header button' }],
        },
        {
          name: 'a primary navigation landmark with one link per destination',
          props: {
            appName: 'Acme',
            navigation: {
              label: 'Primary',
              links: {
                '/articles': { children: 'Articles' },
                '/editor': { children: 'Write', className: 'parity-token', 'aria-current': 'page' },
              },
              className: 'parity-token',
              listClassName: 'parity-token',
              itemClassName: 'parity-token',
            },
          },
        },
        {
          name: 'a navigation link navigates in-app',
          props: {
            appName: 'Acme',
            navigation: { label: 'Primary', links: { '/articles': { children: 'Articles' } } },
          },
          context: { route: '/settings' },
          interactions: [{ type: 'click', selector: 'nav li a' }],
        },
        {
          name: 'modified clicks on a navigation link are left to the browser',
          props: {
            appName: 'Acme',
            navigation: { label: 'Primary', links: { '/articles': { children: 'Articles' } } },
          },
          context: { route: '/settings' },
          interactions: [
            { type: 'click', selector: 'nav li a', modifiers: { ctrlKey: true } },
            { type: 'click', selector: 'nav li a', modifiers: { metaKey: true } },
          ],
        },
        {
          name: 'name changes',
          props: { appName: 'Acme' },
          interactions: [{ type: 'props', props: { appName: 'Acme Cloud' } }],
        },
      ],
    },
  ],
}
