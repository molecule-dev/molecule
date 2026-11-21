/**
 * Vue wrapping chrome for an e-commerce app — the counterpart of
 * `@molecule/app-storefront-chrome-react`: announcement bar, top nav (cart +
 * profile dropdown), column-based footer, with the same props (React names)
 * and the same DOM for the same input.
 *
 * Stateless about auth and cart shape. Consumers wire up the live cart count
 * and auth state and pass them as props; the components stay compositional and
 * reusable across storefronts with different backends.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import {
 *   StorefrontAnnouncementBar,
 *   StorefrontTopNav,
 * } from '@molecule/app-storefront-chrome-vue'
 *
 * export const StorefrontShell = defineComponent({
 *   props: { cartCount: { type: Number, required: true }, signedIn: Boolean },
 *   setup(props) {
 *     return () =>
 *       h('div', [
 *         h(StorefrontAnnouncementBar, {
 *           message: 'Free shipping on orders over $75',
 *           cta: { to: '/', label: 'Shop now' },
 *         }),
 *         h(StorefrontTopNav, {
 *           brand: 'Bazaar',
 *           isAuthenticated: props.signedIn,
 *           links: [{ to: '/', label: 'Shop', active: true }],
 *           actions: [
 *             { to: '/search', icon: 'search', ariaLabel: 'Search' },
 *             { to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: props.cartCount },
 *           ],
 *           authedMenu: [{ to: '/settings', label: 'My Account' }],
 *           unauthedMenu: [{ to: '/login', label: 'Sign in' }],
 *         }),
 *       ])
 *   },
 * })
 * ```
 *
 * @remarks
 * - Every link is the binding's router `Link` (`<a href>` that navigates
 *   through the molecule router), so the components must render inside
 *   `moleculePlugin`'s router or they throw — the same requirement as React's
 *   `react-router` peer dependency.
 * - `NavActionSpec.icon` is a Material Symbols LIGATURE name (`'shopping_cart'`):
 *   load the "Material Symbols Outlined" font in the host app or the nav shows
 *   raw words instead of icons.
 * - The account/sign-in menu (`authedMenu` when signed in, else
 *   `unauthedMenu`) ALWAYS renders and is reachable regardless of
 *   `profileImageUrl`. The avatar image is an optional enhancement: with no URL
 *   the trigger shows `profileInitials`, else a default avatar icon.
 * - `signOutLabel`, `profileImageAlt` and `accountMenuLabel` default to English
 *   strings; pass translated values (no companion locale bond ships).
 * - Node-valued props arrive as a prop AND a same-named slot; components accept
 *   either (the slot wins).
 *
 * @module
 */

export * from './StorefrontAnnouncementBar.js'
export * from './StorefrontFooter.js'
export * from './StorefrontTopNav.js'
export * from './types.js'
