/**
 * The routing bond's route-params hook. Kept out of the package's exports: it is provided only
 * through `RouterProvider`'s `useRouteParams`, which the provider reads once, at its first
 * render.
 *
 * @module
 */

import { createContext } from 'react'

import type { RouteParams } from '@molecule/app-routing'

/**
 * The hook the routing hooks call for the route params of the calling component, from a routing
 * bond whose native router scopes params to the component (React Router's `useParams`). `null`
 * when the bond's router answers params at the root, as every other native router does.
 */
export const RouteParamsHookContext = createContext<(() => RouteParams) | null>(null)
RouteParamsHookContext.displayName = 'MoleculeRouteParamsHookContext'
