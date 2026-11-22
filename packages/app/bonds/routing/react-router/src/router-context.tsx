/**
 * The context holding the molecule router of one React Router tree, and the provider every
 * router component of this bond renders around the app: app-react's `RouterProvider` with
 * that router, React Router's `Outlet` as the routed view and the bond's route-params hook, so
 * the binding's routing hooks and `RoutedView` work under the bond's router alone. Not
 * re-exported by the index: the router is provided through the bond's components only.
 *
 * @module
 */

import { createContext, type JSX, type ReactNode } from 'react'
import { Outlet } from 'react-router'

import { RouterProvider as BindingRouterProvider } from '@molecule/app-react'

import { useNativeRouteParams } from './route-params.js'
import type { Router } from './types.js'

/** The molecule router of the React Router tree around the caller, or `null` outside one. */
export const MoleculeRouterContext = createContext<Router | null>(null)

/**
 * Provides `router` to this bond's hooks and to app-react: its routing hooks read it (with each
 * component's own route params, from React Router's `useParams`), and its `RoutedView` renders
 * React Router's `Outlet`, the matched child route.
 *
 * @param props - The router and the tree under it.
 * @param props.router - The tree's molecule router.
 * @param props.children - The tree.
 * @returns The providers around the tree.
 */
export function ProvideMoleculeRouter({
  router,
  children,
}: {
  router: Router
  children: ReactNode
}): JSX.Element {
  return (
    <MoleculeRouterContext.Provider value={router}>
      <BindingRouterProvider
        router={router}
        routedView={Outlet}
        useRouteParams={useNativeRouteParams}
      >
        {children}
      </BindingRouterProvider>
    </MoleculeRouterContext.Provider>
  )
}
