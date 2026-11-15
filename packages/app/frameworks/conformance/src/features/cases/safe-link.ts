/**
 * `@molecule/app-safe-link-react` cases: the router link that appends a `#top`
 * fragment when its destination matches the current path, so a same-path click
 * still produces an observable URL change.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-safe-link-react`. */
export const safeLinkFeature: FeatureCases = {
  package: '@molecule/app-safe-link-react',
  families: [
    {
      component: 'SafeLink',
      cases: [
        {
          name: 'a link to another path keeps it',
          props: { to: '/settings' },
          children: ['Settings'],
          context: { route: '/dashboard' },
        },
        {
          name: 'element children render inside the anchor',
          props: { to: '/settings' },
          children: [{ tag: 'strong', children: ['Settings'] }],
          context: { route: '/dashboard' },
        },
        {
          name: 'no children renders an empty anchor',
          props: { to: '/settings' },
          context: { route: '/dashboard' },
        },
        {
          name: 'the exact current path appends #top',
          props: { to: '/settings' },
          children: ['Settings'],
          context: { route: '/settings' },
        },
        {
          name: 'the current path with a trailing slash also matches',
          props: { to: '/settings/' },
          children: ['Settings'],
          context: { route: '/settings' },
        },
        {
          name: 'a trailing slash on both is stripped before #top',
          props: { to: '/blog/' },
          children: ['Blog'],
          context: { route: '/blog/' },
        },
        {
          name: 'a path prefix is not a same-path match',
          props: { to: '/settings/profile' },
          children: ['Profile'],
          context: { route: '/settings' },
        },
        {
          name: 'a query and hash in the destination are kept',
          props: { to: '/settings?tab=billing#plan' },
          children: ['Billing'],
          context: { route: '/dashboard' },
        },
        {
          name: 'className, id, data-mol-id and an aria-label pass through',
          props: {
            to: '/settings',
            className: 'parity-token',
            id: 'nav-settings',
            'data-mol-id': 'nav-settings',
            'aria-label': 'Settings navigation',
          },
          children: ['Settings'],
          context: { route: '/dashboard' },
        },
        {
          name: 'a to change recomputes the fragment',
          props: { to: '/settings' },
          children: ['Settings'],
          context: { route: '/settings' },
          interactions: [{ type: 'props', props: { to: '/profile' } }],
        },
        {
          name: 'navigating to the destination appends #top on the same anchor',
          props: { to: '/settings' },
          children: ['Settings'],
          context: { route: '/dashboard' },
          interactions: [{ type: 'navigate', to: '/settings' }],
        },
        {
          name: 'a plain click navigates and prevents the default',
          props: { to: '/settings' },
          children: ['Settings'],
          context: { route: '/dashboard' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'a same-path click still lands on #top',
          props: { to: '/settings' },
          children: ['Settings'],
          context: { route: '/settings' },
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'a modified click is left to the browser and still calls the handler',
          props: { to: '/settings' },
          children: ['Settings'],
          context: { route: '/dashboard' },
          callbacks: ['onClick'],
          interactions: [
            { type: 'click', selector: 'a', modifiers: { ctrlKey: true } },
            { type: 'click', selector: 'a', modifiers: { metaKey: true } },
            { type: 'click', selector: 'a', modifiers: { shiftKey: true } },
            { type: 'click', selector: 'a', modifiers: { altKey: true } },
          ],
        },
        {
          name: 'target=_blank is left to the browser',
          props: { to: '/settings', target: '_blank', rel: 'noopener noreferrer' },
          children: ['Settings'],
          context: { route: '/dashboard' },
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'state and replace reach the new history entry',
          props: { to: '/settings', replace: true, state: { from: 'dashboard' } },
          children: ['Settings'],
          context: { route: '/dashboard' },
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'a destination click lands on its query and hash',
          props: { to: '/settings?tab=billing#plan' },
          children: ['Billing'],
          context: { route: '/dashboard' },
          interactions: [{ type: 'click', selector: 'a' }],
        },
      ],
    },
  ],
}
