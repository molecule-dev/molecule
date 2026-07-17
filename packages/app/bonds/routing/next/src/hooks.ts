/**
 * React hook that builds a Next.js App Router-backed molecule Router and bonds it as
 * the active singleton.
 *
 * @module
 */

import { useEffect, useMemo } from 'react'

import { type Router, setRouter } from '@molecule/app-routing'

import { createNextRouter } from './provider.js'
import type { NextRouterConfig } from './types.js'

/**
 * Builds the molecule Router from `next/navigation` hook values AND bonds it via
 * `@molecule/app-routing`'s `setRouter`, so `navigate()`/`getRouter()` drive the REAL
 * App Router (not the core's auto-created fallback that does full-page reloads).
 *
 * Call it in a `'use client'` component near the root layout, passing the values from
 * `useRouter()`/`usePathname()`/`useSearchParams()`/`useParams()`. It rebuilds and
 * re-bonds on every route change so location/params stay current.
 *
 * @param config - The Next.js router config (`navigation`, `pathname`, `searchParams`,
 *   `params`, optional `routes`) assembled from `next/navigation` hooks.
 * @returns The bonded molecule Router.
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
 * import { useMoleculeRouter } from '@molecule/app-routing-next'
 *
 * export function MoleculeRouterBridge({ children }: { children: React.ReactNode }) {
 *   // Bonds automatically — molecule packages' navigate() now drive the App Router.
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
 */
export function useMoleculeRouter(config: NextRouterConfig): Router {
  const { navigation, pathname, searchParams, params, routes } = config

  const router = useMemo(
    () => createNextRouter({ navigation, pathname, searchParams, params, routes }),
    [navigation, pathname, searchParams, params, routes],
  )

  useEffect(() => {
    // Bond THIS adapter so @molecule/app-routing's navigate()/getRouter() drive the
    // real Next.js App Router instead of the core's fallback (window.location) router.
    setRouter(router)
  }, [router])

  return router
}
