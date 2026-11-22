/**
 * React hook that builds a Next.js App Router-backed molecule Router and bonds it as
 * the active singleton.
 *
 * @module
 */

import { useEffect, useLayoutEffect } from 'react'

import { type Router, setRouter } from '@molecule/app-routing'

import { useLiveHistory } from './live-history.js'
import type { NextRouterConfig } from './types.js'

// Runs after React commits and before the browser paints: the bond happens before the pages
// run their effects (a page's mount effect may call `navigate()` or `getRouter()`, and React
// runs a parent's effects after its children's), and subscribers hear a navigation before
// its page is painted. `useEffect` on the server, where layout effects do not run.
const useBeforePaintEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Builds the molecule Router from `next/navigation` hook values AND bonds it via
 * `@molecule/app-routing`'s `setRouter`, so `navigate()`/`getRouter()` drive the REAL
 * App Router (not the core's auto-created fallback that does full-page reloads).
 *
 * Call it in a `'use client'` component near the root layout, passing the values from
 * `useRouter()`/`usePathname()`/`useSearchParams()`/`useParams()`. The component owns
 * ONE router for its lifetime — the history reads a ref that every render refreshes
 * with the latest hook values — and bonds it once on mount, before the pages below it run
 * their effects. Subscribers (guards, page
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
  // One router for the component's whole life; its history reads the latest values, so the
  // location/params/queries stay current at every call.
  const { router, history } = useLiveHistory(config)

  // Bond THIS adapter once, so @molecule/app-routing's navigate()/getRouter() drive the
  // real Next.js App Router instead of the core's fallback (window.location) router.
  useBeforePaintEffect(() => {
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

  // After every commit: a navigation's entry, or an entry Next rewrote in place
  // (`router.refresh()`, a server action), gets its key and state before anything else
  // can move the history (Next writes the entry in an insertion effect, which runs first).
  // No dependency list: a refresh changes none of the hook values.
  useBeforePaintEffect(() => {
    history.syncEntry()
  })

  // Notify after commit, before paint: this effect re-runs whenever the location changed —
  // every navigation Next commits changes it, whether this router started it
  // (push/replace), a `<Link>` did, or the back button moved the entry (marked as a pop
  // above). It runs after the commit that made the hook values current and before the
  // browser paints it, and React renders what a subscriber schedules there before that paint,
  // so a component that reads the router shows the new location with the new page. React
  // batching reports the final location once. The first run (mount) notifies nothing, and a
  // navigation whose URL matches the current one (Next skips its history write) does not
  // re-run it.
  const pathKey = history.pathKey()
  useBeforePaintEffect(() => {
    history.notifyAfterCommit()
  }, [history, pathKey])

  return router
}
