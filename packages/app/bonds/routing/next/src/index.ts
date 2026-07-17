/**
 * Next.js App Router provider for molecule.dev.
 *
 * Adapts Next.js App Router navigation to the molecule `Router` interface from
 * `@molecule/app-routing`, so molecule packages and app code can navigate, read
 * params/query, and register guards without importing `next/navigation`.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
 * import { useMoleculeRouter } from '@molecule/app-routing-next'
 *
 * // Mount once near the root layout. useMoleculeRouter recreates + re-bonds on every
 * // route change (via setRouter in an effect) so location/params stay current and
 * // @molecule/app-routing's navigate() drives THIS App Router.
 * export function MoleculeRouterBridge({ children }: { children: React.ReactNode }) {
 *   useMoleculeRouter({
 *     navigation: useRouter(),
 *     pathname: usePathname(),
 *     searchParams: Object.fromEntries(useSearchParams()),
 *     params: useParams(),
 *   })
 *
 *   return children
 * }
 * ```
 *
 * @remarks
 * - **Use `useMoleculeRouter(...)` to bond the router** from a `'use client'`
 *   component near the root layout (the adapter cannot run in Server Components). It
 *   calls `@molecule/app-routing`'s `setRouter` in an effect, so molecule packages'
 *   `navigate()`/`getRouter()` drive the real App Router.
 * - **Do NOT wire the exported `provider` const in a Next app.** It is a no-hooks
 *   fallback: its location is frozen at import time, `getParams()` is always empty,
 *   and `navigate()` falls back to `window.location.href` — a full page reload that
 *   bypasses the App Router.
 * - **Forgotten wiring never errors.** `@molecule/app-routing`'s `getRouter()`
 *   auto-creates a plain browser router when nothing is bonded, so molecule packages
 *   keep "working" with full-page reloads — check wiring first when SPA navigation
 *   degrades.
 * - `createMiddlewareGuard()` (for `middleware.ts`) returns plain
 *   `{ redirect: string } | { continue: true }` objects — map them to
 *   `NextResponse.redirect(new URL(result.redirect, request.url))` /
 *   `NextResponse.next()` yourself; returning the guard result directly does nothing.
 * - `searchParams` must be a plain object — spread the hook value with
 *   `Object.fromEntries(useSearchParams())`.
 *
 * @module
 */

export * from './hooks.js'
export * from './middleware.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
