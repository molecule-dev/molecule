/**
 * The molecule router of a React Router data router (`createBrowserRouter`,
 * `createMemoryRouter`, …), built from the router object this bond's `RouterProvider`s are
 * given: its location and matched params from `router.state`, navigation through
 * `router.navigate`, and subscribers from `router.subscribe`. Not re-exported by the index.
 *
 * @module
 */

import { type JSX, type ReactNode, useEffect, useLayoutEffect, useState } from 'react'
import { parsePath, type RouterProviderProps as ReactRouterProviderProps } from 'react-router'

import {
  createHistoryRouter,
  type NavigationAction,
  type RouterHistory,
  setRouter,
} from '@molecule/app-routing'

import { ProvideMoleculeRouter } from './router-context.js'
import type { RouteLocation, RouteParams, Router } from './types.js'

/** A React Router data router, as its `RouterProvider` takes it. */
export type DataRouter = ReactRouterProviderProps['router']

// Bond before pages run their effects (a page's effect may call `getRouter()`); `useEffect` on
// the server, where layout effects do not run.
const useBondEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Maps a data router's history action to the molecule action.
 *
 * @param historyAction - `router.state.historyAction`.
 * @returns The molecule `NavigationAction`.
 */
const actionOf = (historyAction: string): NavigationAction =>
  historyAction === 'POP' ? 'pop' : historyAction === 'REPLACE' ? 'replace' : 'push'

/**
 * The href React Router's own `<Link>` writes for an in-app `path` under `dataRouter`: its
 * basename joined to the path (the root as the basename itself), through the router's history.
 *
 * @param dataRouter - The data router.
 * @param path - Pathname with optional query string and hash.
 * @returns The href.
 */
const hrefOf = (dataRouter: DataRouter, path: string): string => {
  const { pathname = '/', search = '', hash = '' } = parsePath(path)
  const basename = dataRouter.basename ?? '/'
  const joined =
    basename === '/'
      ? pathname
      : pathname === '/'
        ? basename
        : `${basename.replace(/\/+$/, '')}/${pathname.replace(/^\/+/, '')}`
  return dataRouter.createHref({ pathname: joined, search, hash, state: null, key: 'default' })
}

/**
 * The `RouterHistory` over a data router. Subscribers hear each committed navigation when the
 * data router publishes it, which is before React renders the new route.
 *
 * @param dataRouter - The data router.
 * @returns The history.
 */
export const createDataRouterHistory = (dataRouter: DataRouter): RouterHistory => ({
  location: (): RouteLocation => {
    const { pathname, search, hash, state, key } = dataRouter.state.location
    // React Router models "no state" as `null`; the molecule location leaves it `undefined`.
    return { pathname, search, hash, state: state ?? undefined, key }
  },

  // The deepest match holds every param of its branch; an optional segment that matched
  // nothing is left out.
  params: (): RouteParams => {
    const { matches } = dataRouter.state
    const params: RouteParams = {}
    for (const [name, value] of Object.entries(matches[matches.length - 1]?.params ?? {})) {
      if (value !== undefined) params[name] = value
    }
    return params
  },

  push: (path, state) => dataRouter.navigate(path, { state }),

  replace: (path, state) => dataRouter.navigate(path, { replace: true, state }),

  go: (delta) => {
    void dataRouter.navigate(delta)
  },

  createHref: (path) => hrefOf(dataRouter, path),

  // The data router publishes every state change (loading, fetchers, errors); only a new
  // location is a navigation.
  listen: (listener) => {
    let last = dataRouter.state.location
    return dataRouter.subscribe((state) => {
      if (state.location === last) return
      last = state.location
      listener(actionOf(state.historyAction))
    })
  },
})

/**
 * Builds ONE molecule router over `dataRouter` for the component's life (a new one when a
 * different data router is passed), bonds it with `setRouter`, and provides it to this bond's
 * hooks and to `@molecule/app-react` around `children`.
 *
 * @param props - The data router and the tree under it.
 * @param props.dataRouter - The data router the provider renders.
 * @param props.children - React Router's own provider.
 * @returns The providers around `children`.
 */
export function ProvideDataRouter({
  dataRouter,
  children,
}: {
  dataRouter: DataRouter
  children: ReactNode
}): JSX.Element {
  const [built, setBuilt] = useState(() => ({
    dataRouter,
    router: createHistoryRouter(createDataRouterHistory(dataRouter)),
  }))
  const current =
    built.dataRouter === dataRouter
      ? built
      : { dataRouter, router: createHistoryRouter(createDataRouterHistory(dataRouter)) }
  if (current !== built) setBuilt(current)
  const router: Router = current.router

  useBondEffect(() => {
    setRouter(router)
  }, [router])

  return <ProvideMoleculeRouter router={router}>{children}</ProvideMoleculeRouter>
}
