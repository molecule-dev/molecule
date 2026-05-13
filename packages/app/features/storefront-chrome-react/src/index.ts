/**
 * `@molecule/app-storefront-chrome-react` — wrapping chrome for an
 * e-commerce app: announcement bar, top nav (cart + profile dropdown),
 * column-based footer.
 *
 * Stateless about auth and cart shape. Consumers wire up the live cart
 * count + auth state and pass them as props; the components stay
 * compositional and reusable across storefronts with different
 * backends.
 *
 * Extracted from the online-store flagship.
 *
 * @example
 * ```tsx
 * import {
 *   StorefrontAnnouncementBar,
 *   StorefrontTopNav,
 *   StorefrontFooter,
 * } from '@molecule/app-storefront-chrome-react'
 *
 * <>
 *   <StorefrontAnnouncementBar
 *     message="Free shipping on orders over $75"
 *     cta={{ to: '/', label: 'Shop now' }}
 *   />
 *   <StorefrontTopNav
 *     brand="Bazaar"
 *     links={[{ to: '/', label: 'Shop', active: true }, { to: '/search?q=all', label: 'Categories' }]}
 *     actions={[
 *       { to: '/search', icon: 'search', ariaLabel: 'Search' },
 *       { to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: cartCount },
 *     ]}
 *     isAuthenticated={isAuthenticated}
 *     profileImageUrl={user?.avatarUrl}
 *     authedMenu={[{ to: '/settings', label: 'My Account' }, { to: '/orders', label: 'Orders' }]}
 *     unauthedMenu={[{ to: '/login', label: 'Sign in' }, { to: '/signup', label: 'Create account' }]}
 *     onSignOut={handleSignOut}
 *   />
 * </>
 * ```
 *
 * @module
 */

export * from './StorefrontAnnouncementBar.js'
export * from './StorefrontFooter.js'
export * from './StorefrontTopNav.js'
export * from './types.js'
