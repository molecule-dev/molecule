/**
 * `@molecule/app-storefront-chrome-react` — wrapping chrome for an
 * e-commerce app: announcement bar, top nav (cart + profile dropdown),
 * column-based footer. Extracted verbatim from the online-store
 * flagship, including its visual identity (white/slate surfaces, green
 * hover accents).
 *
 * Stateless about auth and cart shape. Consumers wire up the live cart
 * count + auth state and pass them as props; the components stay
 * compositional and reusable across storefronts with different
 * backends.
 *
 * @example
 * ```tsx
 * import {
 *   StorefrontAnnouncementBar,
 *   StorefrontFooter,
 *   StorefrontTopNav,
 * } from '@molecule/app-storefront-chrome-react'
 *
 * function StorefrontShell({ cartCount, isAuthenticated, avatarUrl, onSignOut }: {
 *   cartCount: number
 *   isAuthenticated: boolean
 *   avatarUrl?: string
 *   onSignOut: () => void
 * }) {
 *   return (
 *     <>
 *       <StorefrontAnnouncementBar
 *         message="Free shipping on orders over $75"
 *         cta={{ to: '/', label: 'Shop now' }}
 *       />
 *       <StorefrontTopNav
 *         brand="Bazaar"
 *         links={[{ to: '/', label: 'Shop', active: true }]}
 *         actions={[
 *           { to: '/search', icon: 'search', ariaLabel: 'Search' },
 *           { to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: cartCount },
 *         ]}
 *         isAuthenticated={isAuthenticated}
 *         profileImageUrl={avatarUrl}
 *         authedMenu={[{ to: '/settings', label: 'My Account' }, { to: '/orders', label: 'Orders' }]}
 *         unauthedMenu={[{ to: '/login', label: 'Sign in' }, { to: '/signup', label: 'Create account' }]}
 *         onSignOut={onSignOut}
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Hard requirement: `react-router-dom` (peer dep) — every link is a
 *   router `<Link>`, so the components MUST render inside a `<Router>`
 *   or they throw. In npm-workspace/symlinked setups keep
 *   `react-router-dom` in Vite `resolve.dedupe`.
 * - `NavActionSpec.icon` is a Material Symbols LIGATURE name
 *   (`'shopping_cart'`): load the "Material Symbols Outlined" font in
 *   the host app or the nav shows raw words instead of icons.
 * - The account/sign-in menu (`authedMenu` when signed in, else
 *   `unauthedMenu`) ALWAYS renders and is reachable regardless of
 *   `profileImageUrl`. The avatar image is an optional enhancement: with
 *   no URL the trigger shows `profileInitials`, else a default avatar
 *   icon — reachability is never gated on the image.
 * - `signOutLabel`, `profileImageAlt` and `accountMenuLabel` default to
 *   English strings; pass translated values (no companion locale bond
 *   ships).
 * - Styling is the flagship palette hardcoded with raw utilities
 *   (`bg-white dark:bg-slate-900`, slate-900 footer, GREEN link-hover
 *   accents, `max-w-[1280px]`), not ClassMap tokens: it will not follow
 *   your brand automatically, and apps outside the flagship safelists
 *   must ensure their Tailwind build scans these literals.
 *
 * @module
 */

export * from './StorefrontAnnouncementBar.js'
export * from './StorefrontFooter.js'
export * from './StorefrontTopNav.js'
export * from './types.js'
