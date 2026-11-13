/**
 * React hook that builds a Next.js App Router-backed molecule Router and bonds it as
 * the active singleton.
 *
 * @module
 */

import { useEffect, useRef, useState } from 'react'

import { createHistoryRouter, type Router, setRouter } from '@molecule/app-routing'

import { createNextHistory } from './history.js'
import type { NextRouterConfig } from './types.js'

/**
 * Builds the molecule Router from `next/navigation` hook values AND bonds it via
 * `@molecule/app-routing`'s `setRouter`, so `navigate()`/`getRouter()` drive the REAL
 * App Router (not the core's auto-created fallback that does full-page reloads).
 *
 * Call it in a `'use client'` component near the root layout, passing the values from
 * `useRouter()`/`usePathname()`/`useSearchParams()`/`useParams()`. The component owns
 * ONE router for its lifetime — the history reads a ref that every render refreshes
 * with the latest hook values — and bonds it once on mount. Subscribers (guards, page
 * transitions, `subscribe`) keep listening across navigations, and a click on a Next
 * `<Link>` or the back button reaches them exactly once, after Next has committed.
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
  // The history reads this ref, so the router survives navigation-driven re-renders
  // while its location/params/queries stay current at every call.
  const configRef = useRef(config)
  configRef.current = config

  const [created] = useState(() => {
    const nextHistory = createNextHistory(() => configRef.current)
    return {
      router: createHistoryRouter(nextHistory, { routes: config.routes }),
      history: nextHistory,
    }
  })
  const { router, history } = created

  // Bond THIS adapter once, so @molecule/app-routing's navigate()/getRouter() drive the
  // real Next.js App Router instead of the core's fallback (window.location) router.
  useEffect(() => {
    setRouter(router)
  }, [router])

  // A back/forward move arrives as a popstate on window: mark it before the hook values
  // catch up, so the notification below reports `'pop'`. Outside the browser (SSR)
  // there is nothing to listen to.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPop = (): void => {
      history.markPop()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
    }
  }, [history])

  // Notify after commit: this effect re-runs whenever the location changed — every
  // navigation Next commits changes it, whether this router started it (push/replace),
  // a `<Link>` did, or the back button moved the entry (marked as a pop above). It runs
  // after the re-render that made the hook values current; React batching reports the
  // final location once. The first run (mount) notifies nothing, and a navigation whose
  // URL matches the current one (Next skips its history write) does not re-run it.
  const pathKey = history.pathKey()
  useEffect(() => {
    history.notifyAfterCommit()
  }, [history, pathKey])

  return router
}
