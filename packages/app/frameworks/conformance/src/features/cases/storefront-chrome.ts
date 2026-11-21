/**
 * `@molecule/app-storefront-chrome-react` cases: the announcement bar (message
 * plus an optional CTA link), the top nav (brand link, nav links, icon actions
 * with badges, the profile dropdown with its signed-in / signed-out menus and
 * the sign-out row) and the footer (brand block, tagline, link columns and the
 * copyright row).
 *
 * Every component is stateless about auth and cart shape: the consumer passes
 * the cart count and the auth state in, the components render them.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A node message (React renders it where the text would go). */
const messageNode = [{ tag: 'strong', attrs: { 'data-message': '' }, children: ['Free shipping'] }]
/** A node CTA label. */
const ctaLabelNode = { $nodes: [{ tag: 'em', children: ['Shop now'] }] }
/** A node brand mark. */
const brandNode = [{ tag: 'span', attrs: { 'data-brand': '' }, children: ['Bazaar'] }]
/** A node footer heading. */
const headingNode = { $nodes: [{ tag: 'strong', children: ['Support'] }] }
/** A node footer link label. */
const footerLabelNode = { $nodes: [{ tag: 'em', children: ['Shipping'] }] }
/** A node copyright. */
const copyrightNode = [{ tag: 'span', attrs: { 'data-copyright': '' }, children: ['© Bazaar'] }]

const trigger = '[data-mol-id="profile-trigger-01"]'
const dropdown = '[data-mol-id="profile-dropdown-01"]'

const unauthedMenu = [
  { to: '/login', label: 'Sign in', dataMolId: 'nav-login' },
  { to: '/signup', label: 'Create account', dataMolId: 'nav-signup' },
]

const authedMenu = [
  { to: '/settings', label: 'My Account', dataMolId: 'nav-account' },
  { to: '/orders', label: 'Orders' },
]

const links = [
  { to: '/', label: 'Shop', active: true },
  { to: '/collections', label: 'Collections', dataMolId: 'nav-collections' },
]

const actions = [
  { to: '/search', icon: 'search', ariaLabel: 'Search' },
  { to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: 3, dataMolId: 'nav-cart' },
]

const columns = [
  {
    heading: 'Shop',
    links: [
      { to: '/new', label: 'New arrivals' },
      { to: '/sale', label: 'Sale' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { to: '/contact', label: 'Contact us' },
      { to: '/shipping', label: 'Shipping' },
    ],
  },
]

/** `@molecule/app-storefront-chrome-react`. */
export const storefrontChromeFeature: FeatureCases = {
  package: '@molecule/app-storefront-chrome-react',
  families: [
    {
      component: 'StorefrontAnnouncementBar',
      cases: [
        { name: 'message only', props: { message: 'Free shipping on orders over $75' } },
        {
          name: 'message with a CTA link',
          props: {
            message: 'Free shipping on orders over $75',
            cta: { to: '/shop', label: 'Shop now' },
          },
        },
        {
          name: 'node message and a node CTA label',
          props: {
            message: { $nodes: messageNode },
            cta: { to: '/shop', label: ctaLabelNode },
          },
        },
        {
          name: 'className passthrough',
          props: { message: 'Sale', className: 'parity-token' },
        },
        {
          name: 'the CTA link navigates in place',
          props: { message: 'Sale', cta: { to: '/shop', label: 'Shop now' } },
          context: { route: '/' },
          interactions: [{ type: 'click', selector: '[data-mol-id="announcement-link"]' }],
        },
        {
          name: 'the CTA disappears when removed',
          props: { message: 'Sale', cta: { to: '/shop', label: 'Shop now' } },
          interactions: [{ type: 'props', props: { cta: null } }],
        },
        {
          name: 'the message changes',
          props: { message: 'Sale' },
          interactions: [
            { type: 'props', props: { message: 'Final sale' } },
            { type: 'props', props: { message: 'Shop the new season' } },
          ],
        },
        {
          name: 'a CTA added after mount',
          props: { message: 'Sale' },
          interactions: [{ type: 'props', props: { cta: { to: '/sale', label: 'Save now' } } }],
        },
      ],
    },
    {
      component: 'StorefrontTopNav',
      cases: [
        {
          name: 'brand with the defaults',
          props: { brand: 'Bazaar', isAuthenticated: false },
        },
        {
          name: 'links and icon actions',
          props: { brand: 'Bazaar', isAuthenticated: false, links, actions },
        },
        {
          name: 'node brand and node link labels',
          props: { isAuthenticated: false },
          slots: { brand: brandNode },
        },
        {
          name: 'a node label inside a nav link',
          props: {
            brand: 'Bazaar',
            isAuthenticated: false,
            links: [
              { to: '/', label: { $nodes: [{ tag: 'strong', children: ['Home'] }] }, active: true },
              { to: '/collections', label: 'Collections' },
            ],
          },
        },
        {
          name: 'zero, negative and absent badges',
          props: {
            brand: 'Bazaar',
            isAuthenticated: false,
            actions: [
              { to: '/search', icon: 'search', ariaLabel: 'Search' },
              { to: '/wishlist', icon: 'favorite', ariaLabel: 'Wishlist', badgeCount: 0 },
              { to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: -2 },
              { to: '/orders', icon: 'receipt_long', ariaLabel: 'Orders', badgeCount: 12 },
            ],
          },
        },
        {
          name: 'brandTo override',
          props: { brand: 'Bazaar', isAuthenticated: false, brandTo: '/home' },
        },
        {
          name: 'className passthrough',
          props: { brand: 'Bazaar', isAuthenticated: false, className: 'parity-token' },
        },
        {
          name: 'the avatar image',
          props: {
            brand: 'Bazaar',
            isAuthenticated: true,
            profileImageUrl: '/me.png',
            profileImageAlt: 'Ada',
          },
        },
        {
          name: 'the avatar initials',
          props: { brand: 'Bazaar', isAuthenticated: true, profileInitials: 'JD' },
        },
        {
          name: 'opens the signed-out menu',
          props: { brand: 'Bazaar', isAuthenticated: false, unauthedMenu },
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'opens the signed-in menu',
          props: { brand: 'Bazaar', isAuthenticated: true, authedMenu },
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'sign out calls onSignOut and closes the menu',
          props: { brand: 'Bazaar', isAuthenticated: true, authedMenu },
          callbacks: ['onSignOut'],
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'click', selector: '[data-mol-id="profile-link-signout"]' },
          ],
        },
        {
          name: 'a menu item click closes the menu',
          props: { brand: 'Bazaar', isAuthenticated: true, authedMenu },
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'click', selector: '[data-mol-id="nav-account"]' },
          ],
        },
        {
          name: 'a second trigger click closes the menu',
          props: { brand: 'Bazaar', isAuthenticated: false, unauthedMenu },
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'click', selector: trigger },
          ],
        },
        {
          name: 'a mousedown outside closes the menu',
          props: { brand: 'Bazaar', isAuthenticated: false, unauthedMenu },
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'pointerdown', selector: 'body' },
          ],
        },
        {
          name: 'a mousedown inside keeps the menu open',
          props: { brand: 'Bazaar', isAuthenticated: false, unauthedMenu },
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'pointerdown', selector: dropdown },
          ],
        },
        {
          name: 'auth changes while the menu is open',
          props: { brand: 'Bazaar', isAuthenticated: false, unauthedMenu },
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'props', props: { isAuthenticated: true, authedMenu } },
          ],
        },
        {
          name: 'signed in without onSignOut has no sign-out row',
          props: { brand: 'Bazaar', isAuthenticated: true, authedMenu },
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'a node sign-out label and a custom account label',
          props: {
            brand: 'Bazaar',
            isAuthenticated: true,
            authedMenu,
            accountMenuLabel: 'Your account',
          },
          slots: { signOutLabel: [{ tag: 'strong', children: ['Log out'] }] },
          callbacks: ['onSignOut'],
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'the brand link navigates home',
          props: { brand: 'Bazaar', isAuthenticated: false },
          context: { route: '/settings' },
          interactions: [{ type: 'click', selector: '[data-mol-id="brand-logo-01"]' }],
        },
        {
          name: 'a nav link navigates',
          props: { brand: 'Bazaar', isAuthenticated: false, links },
          context: { route: '/' },
          interactions: [{ type: 'click', selector: '[data-mol-id="nav-collections"]' }],
        },
        {
          name: 'an icon action navigates',
          props: { brand: 'Bazaar', isAuthenticated: false, actions },
          context: { route: '/' },
          interactions: [{ type: 'click', selector: '[data-mol-id="nav-cart"]' }],
        },
        {
          name: 'links and actions replaced after mount',
          props: { brand: 'Bazaar', isAuthenticated: false, links, actions },
          interactions: [
            {
              type: 'props',
              props: {
                brand: 'Bazaar Market',
                brandTo: '/shop',
                links: [{ to: '/sale', label: 'Sale', active: true }],
                actions: [{ to: '/help', icon: 'help', ariaLabel: 'Help' }],
              },
            },
          ],
        },
        {
          name: 'the avatar switches from the icon to an image',
          props: { brand: 'Bazaar', isAuthenticated: true },
          interactions: [
            { type: 'props', props: { profileInitials: 'JD' } },
            { type: 'props', props: { profileInitials: undefined, profileImageUrl: '/me.png' } },
          ],
        },
      ],
    },
    {
      component: 'StorefrontFooter',
      cases: [
        { name: 'brand and copyright', props: { brand: 'Bazaar', copyright: '© Bazaar' } },
        {
          name: 'tagline, columns and copyright',
          props: { brand: 'Bazaar', tagline: 'Thoughtful goods', columns, copyright: '© Bazaar' },
        },
        {
          name: 'node brand, heading, label and copyright',
          slots: { brand: brandNode, copyright: copyrightNode },
        },
        {
          name: 'a node heading and a node link label',
          props: {
            brand: 'Bazaar',
            copyright: '© Bazaar',
            columns: [
              { heading: headingNode, links: [{ to: '/shipping', label: footerLabelNode }] },
            ],
          },
        },
        {
          name: 'className passthrough',
          props: { brand: 'Bazaar', copyright: '© Bazaar', className: 'parity-token' },
        },
        {
          name: 'empty columns',
          props: { brand: 'Bazaar', columns: [], copyright: '© Bazaar' },
        },
        {
          name: 'a footer link navigates',
          props: { brand: 'Bazaar', columns, copyright: '© Bazaar' },
          context: { route: '/' },
          interactions: [{ type: 'click', selector: 'a[href="/shipping"]' }],
        },
        {
          name: 'the tagline and columns change',
          props: { brand: 'Bazaar', columns, copyright: '© Bazaar' },
          interactions: [
            {
              type: 'props',
              props: {
                tagline: 'Thoughtful goods',
                columns: [{ heading: 'Company', links: [{ to: '/about', label: 'About' }] }],
              },
            },
            { type: 'props', props: { tagline: undefined, columns: [] } },
          ],
        },
        {
          name: 'a tagline added after mount',
          props: { brand: 'Bazaar', copyright: '© Bazaar' },
          interactions: [{ type: 'props', props: { tagline: 'Thoughtful goods' } }],
        },
        {
          name: 'a single column with several links',
          props: {
            brand: 'Bazaar',
            copyright: '© Bazaar',
            columns: [
              {
                heading: 'Legal',
                links: [
                  { to: '/terms', label: 'Terms' },
                  { to: '/privacy', label: 'Privacy' },
                  { to: '/cookies', label: 'Cookies' },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
}
