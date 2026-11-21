/**
 * `@molecule/app-nav-chrome-react` cases: the top / side / bottom nav shells
 * and the page footer — every slot, every item variant, and the item click
 * callback.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A labelled nav item with no node-valued fields, so its recorded callback argument is plain data. */
const nav = (id: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  label: `label-${id}`,
  ...over,
})

/** `@molecule/app-nav-chrome-react`. */
export const navChromeFeature: FeatureCases = {
  package: '@molecule/app-nav-chrome-react',
  families: [
    {
      component: 'AppShellBottomNav',
      cases: [
        { name: 'items', props: { items: [nav('home'), nav('settings')] } },
        { name: 'active item', props: { items: [nav('home'), nav('settings')], activeId: 'home' } },
        {
          name: 'icons, and badge/to ignored',
          props: {
            items: [
              {
                id: 'home',
                label: 'Home',
                to: '/',
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': '' } }] },
                badge: { $nodes: [{ tag: 'span', attrs: { 'data-badge': '' }, children: ['9'] }] },
              },
              nav('settings'),
            ],
          },
        },
        {
          name: 'node label',
          props: {
            items: [{ id: 'count', label: { $nodes: [{ tag: 'strong', children: ['12'] }] } }],
          },
        },
        { name: 'empty items', props: { items: [] } },
        {
          name: 'disabled item ignores clicks',
          props: { items: [nav('home', { disabled: true }), nav('settings')] },
          callbacks: ['onItemClick'],
          interactions: [
            { type: 'click', selector: 'nav[aria-label="Bottom"] > button:nth-of-type(1)' },
          ],
        },
        {
          name: 'clicking an item calls onItemClick',
          props: { items: [nav('home'), nav('settings')] },
          callbacks: ['onItemClick'],
          interactions: [
            { type: 'click', selector: 'nav[aria-label="Bottom"] > button:nth-of-type(2)' },
          ],
        },
        {
          name: 'className passthrough',
          props: { items: [nav('home')], className: 'parity-token' },
        },
      ],
    },
    {
      component: 'AppShellFooter',
      cases: [
        { name: 'no props' },
        {
          name: 'logo, copyright and links',
          props: {
            copyright: '© 2026 Acme',
            links: [{ label: 'Privacy', to: '/privacy' }, { label: 'Terms' }],
          },
          slots: { logo: [{ tag: 'span', attrs: { 'data-logo': '' }, children: ['Acme'] }] },
        },
        {
          name: 'node copyright',
          slots: {
            copyright: [{ tag: 'strong', children: ['Acme Inc.'] }],
            right: [{ tag: 'span', attrs: { 'data-right': '' }, children: ['locale'] }],
          },
        },
        {
          name: 'node link label',
          props: {
            links: [
              { label: { $nodes: [{ tag: 'strong', children: ['Privacy'] }] }, to: '/privacy' },
            ],
          },
        },
        { name: 'empty links', props: { links: [] } },
        {
          name: 'clicking a link keeps the default',
          props: { links: [{ label: 'Privacy', to: '/privacy' }, { label: 'Terms' }] },
          interactions: [
            { type: 'click', selector: 'footer nav[aria-label="Footer"] > a:nth-of-type(1)' },
          ],
        },
        { name: 'className passthrough', props: { className: 'parity-token' } },
      ],
    },
    {
      component: 'AppShellSideNav',
      cases: [
        { name: 'flat items', props: { items: [nav('home'), nav('settings')] } },
        {
          name: 'active item',
          props: { items: [nav('home'), nav('settings')], activeId: 'settings' },
        },
        {
          name: 'grouped items with headings',
          props: {
            groups: [
              { id: 'main', heading: 'Main', items: [nav('home'), nav('search')] },
              { id: 'more', heading: 'Settings', items: [nav('settings')] },
            ],
          },
        },
        {
          name: 'group without a heading',
          props: { groups: [{ id: 'main', items: [nav('home')] }] },
        },
        {
          name: 'node group heading',
          props: {
            groups: [
              {
                id: 'main',
                heading: { $nodes: [{ tag: 'em', children: ['Main'] }] },
                items: [nav('home')],
              },
            ],
          },
        },
        {
          name: 'items and groups together',
          props: {
            items: [nav('home')],
            groups: [{ id: 'more', heading: 'More', items: [nav('settings')] }],
          },
        },
        {
          name: 'icons and badges',
          props: {
            items: [
              {
                id: 'home',
                label: 'Home',
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': '' } }] },
                badge: '3',
              },
              {
                id: 'inbox',
                label: 'Inbox',
                badge: { $nodes: [{ tag: 'span', attrs: { 'data-badge': '' }, children: ['9'] }] },
              },
            ],
          },
        },
        {
          name: 'header and footer slots',
          props: { items: [nav('home')] },
          slots: {
            header: [{ tag: 'div', attrs: { 'data-header': '' }, children: ['Acme'] }],
            footer: [{ tag: 'div', attrs: { 'data-footer': '' }, children: ['theme'] }],
          },
        },
        {
          name: 'footer without a header',
          props: { items: [nav('home')] },
          slots: { footer: [{ tag: 'div', attrs: { 'data-footer': '' }, children: ['sign out'] }] },
        },
        { name: 'empty items', props: { items: [] } },
        {
          name: 'clicking a flat item calls onItemClick',
          props: { items: [nav('home'), nav('settings')] },
          callbacks: ['onItemClick'],
          interactions: [
            { type: 'click', selector: 'aside nav[aria-label="Sidebar"] > button:nth-of-type(2)' },
          ],
        },
        {
          name: 'clicking a grouped item calls onItemClick',
          props: {
            groups: [
              { id: 'main', heading: 'Main', items: [nav('home'), nav('search')] },
              { id: 'more', heading: 'More', items: [nav('settings')] },
            ],
          },
          callbacks: ['onItemClick'],
          interactions: [
            {
              type: 'click',
              selector:
                'aside nav[aria-label="Sidebar"] section:nth-of-type(1) button:nth-of-type(2)',
            },
          ],
        },
        {
          name: 'className passthrough',
          props: { items: [nav('home')], className: 'parity-token' },
        },
      ],
    },
    {
      component: 'AppShellTopNav',
      cases: [
        { name: 'no props' },
        {
          name: 'logo, items and right slot',
          props: { items: [nav('home'), nav('settings')] },
          slots: {
            logo: [{ tag: 'span', attrs: { 'data-logo': '' }, children: ['Acme'] }],
            right: [{ tag: 'span', attrs: { 'data-right': '' }, children: ['account'] }],
          },
        },
        {
          name: 'active item',
          props: { items: [nav('home'), nav('settings')], activeId: 'settings' },
        },
        {
          name: 'icons and badges',
          props: {
            items: [
              {
                id: 'home',
                label: 'Home',
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': '' } }] },
                badge: '3',
              },
              {
                id: 'inbox',
                label: 'Inbox',
                badge: { $nodes: [{ tag: 'span', attrs: { 'data-badge': '' }, children: ['9'] }] },
              },
            ],
          },
        },
        {
          name: 'node label',
          props: {
            items: [{ id: 'count', label: { $nodes: [{ tag: 'strong', children: ['12'] }] } }],
          },
        },
        {
          name: 'disabled item',
          props: { items: [nav('home', { disabled: true }), nav('settings')] },
        },
        { name: 'empty items', props: { items: [] } },
        {
          name: 'clicking an item calls onItemClick',
          props: { items: [nav('home'), nav('settings')] },
          callbacks: ['onItemClick'],
          interactions: [
            { type: 'click', selector: 'header nav[aria-label="Main"] > button:nth-of-type(2)' },
          ],
        },
        {
          name: 'active item follows a prop change',
          props: { items: [nav('home'), nav('settings')], activeId: 'home' },
          interactions: [{ type: 'props', props: { activeId: 'settings' } }],
        },
        { name: 'className passthrough', props: { className: 'parity-token' } },
      ],
    },
  ],
}
