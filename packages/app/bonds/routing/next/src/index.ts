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
 * import { useEffect, useMemo } from 'react'
 * import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
 * import { setRouter } from '@molecule/app-routing'
 * import { createNextRouter } from '@molecule/app-routing-next'
 *
 * // Mount once near the root layout. Recreate + re-bond on every route change so
 * // location/params stay current.
 * export function MoleculeRouterBridge({ children }: { children: React.ReactNode }) {
 *   const navigation = useRouter()
 *   const pathname = usePathname()
 *   const searchParams = useSearchParams()
 *   const params = useParams()
 *
 *   const router = useMemo(
 *     () =>
 *       createNextRouter({
 *         navigation,
 *         pathname,
 *         searchParams: Object.fromEntries(searchParams),
 *         params,
 *       }),
 *     [navigation, pathname, searchParams, params],
 *   )
 *
 *   useEffect(() => {
 *     setRouter(router)
 *   }, [router])
 *
 *   return children
 * }
 * ```
 *
 * @remarks
 * - **Do NOT wire the exported `provider` const in a Next app.** It is a no-hooks
 *   fallback: its location is frozen at import time, `getParams()` is always empty,
 *   and `navigate()` falls back to `window.location.href` — a full page reload that
 *   bypasses the App Router. Always build the router from `next/navigation` hooks as
 *   in the example (client component — the adapter cannot run in Server Components).
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

export * from './middleware.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
