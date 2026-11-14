/**
 * `@molecule/app-header-react` cases: brand link, the default theme toggle,
 * action slots and the fixed / static bar.
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
          name: 'the default toggle switches the theme',
          props: { appName: 'Acme' },
          context: { theme: 'light' },
          interactions: [{ type: 'click', selector: 'header button' }],
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
