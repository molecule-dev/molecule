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
 * import { Outlet } from 'react-router'
 *
 * import type { UserProfile } from '@molecule/app-auth'
 * import { useAuth } from '@molecule/app-react'
 * import {
 *   StorefrontAnnouncementBar,
 *   StorefrontFooter,
 *   StorefrontTopNav,
 * } from '@molecule/app-storefront-chrome-react'
 *
 * export function StorefrontLayout({ cartCount }: { cartCount: number }) {
 *   const { isAuthenticated, user, logout } = useAuth<UserProfile>()
 *   return (
 *     <>
 *       <StorefrontAnnouncementBar message="Free shipping on orders over $75" cta={{ to: '/shop', label: 'Shop now' }} />
 *       <StorefrontTopNav
 *         brand="Bazaar"
 *         links={[{ to: '/shop', label: 'Shop', active: true }, { to: '/sale', label: 'Sale' }]}
 *         actions={[{ to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: cartCount }]}
 *         isAuthenticated={isAuthenticated}
 *         profileImageUrl={user?.avatar}
 *         authedMenu={[{ to: '/orders', label: 'Orders' }]}
 *         unauthedMenu={[{ to: '/login', label: 'Sign in' }, { to: '/signup', label: 'Create account' }]}
 *         onSignOut={() => void logout()}
 *       />
 *       <main>
 *         <Outlet />
 *       </main>
 *       <StorefrontFooter
 *         brand="Bazaar"
 *         tagline="Everyday goods, fairly priced."
 *         columns={[{ heading: 'Help', links: [{ to: '/shipping', label: 'Shipping' }, { to: '/returns', label: 'Returns' }] }]}
 *         copyright="© 2026 Bazaar"
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Hard requirement: `react-router` (peer dep — NOT `react-router-dom`)
 *   — every link is a router `<Link>`, so the components MUST render
 *   inside a router (e.g. as a layout route's element, with `<Outlet />`
 *   for the page) or they throw. In npm-workspace/symlinked setups keep
 *   `react-router` in Vite `resolve.dedupe`.
 * - It does NOT read auth or cart state itself: pass `isAuthenticated`,
 *   `profileImageUrl`, `onSignOut` (e.g. from `useAuth()` in
 *   `@molecule/app-react`, which needs `<AuthProvider>` /
 *   `<MoleculeProvider>` above it) and the cart `badgeCount`. The
 *   "Sign Out" row only appears when signed in AND `onSignOut` is passed.
 * - `isAuthenticated` and the footer's `brand` + `copyright` are REQUIRED.
 * - Requires a wired ClassMap bond (`setClassMap(classMap)` from
 *   `@molecule/app-ui`); `getClassMap()` throws otherwise.
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
