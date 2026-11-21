/**
 * Solid wrapping chrome for an e-commerce app — the counterpart of
 * `@molecule/app-storefront-chrome-react`: announcement bar, top nav (cart +
 * profile dropdown), column-based footer, with the same props (React names)
 * and the same DOM for the same input.
 *
 * Stateless about auth and cart shape. Consumers wire up the live cart count
 * and auth state and pass them as props; the components stay compositional and
 * reusable across storefronts with different backends.
 *
 * @example
 * ```tsx
 * import {
 *   StorefrontAnnouncementBar,
 *   StorefrontTopNav,
 * } from '@molecule/app-storefront-chrome-solid'
 *
 * export function StorefrontShell(props: { cartCount: number; signedIn: boolean }) {
 *   return (
 *     <div>
 *       <StorefrontAnnouncementBar
 *         message="Free shipping on orders over $75"
 *         cta={{ to: '/', label: 'Shop now' }}
 *       />
 *       <StorefrontTopNav
 *         brand="Bazaar"
 *         isAuthenticated={props.signedIn}
 *         links={[{ to: '/', label: 'Shop', active: true }]}
 *         actions={[
 *           { to: '/search', icon: 'search', ariaLabel: 'Search' },
 *           { to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: props.cartCount },
 *         ]}
 *         authedMenu={[{ to: '/settings', label: 'My Account' }]}
 *         unauthedMenu={[{ to: '/login', label: 'Sign in' }]}
 *       />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Every link is the binding's router `Link` (`<a href>` that navigates
 *   through the molecule router), so the components must render inside a
 *   `MoleculeProvider` whose config has a `router` — the same requirement as
 *   React's `react-router` peer dependency.
 * - `NavActionSpec.icon` is a Material Symbols LIGATURE name (`'shopping_cart'`):
 *   load the "Material Symbols Outlined" font in the host app or the nav shows
 *   raw words instead of icons.
 * - The account/sign-in menu (`authedMenu` when signed in, else
 *   `unauthedMenu`) ALWAYS renders and is reachable regardless of
 *   `profileImageUrl`. The avatar image is an optional enhancement: with no URL
 *   the trigger shows `profileInitials`, else a default avatar icon.
 * - `signOutLabel`, `profileImageAlt` and `accountMenuLabel` default to English
 *   strings; pass translated values (no companion locale bond ships).
 *
 * @module
 */

export * from './StorefrontAnnouncementBar.jsx'
export * from './StorefrontFooter.jsx'
export * from './StorefrontTopNav.jsx'
export * from './types.js'
