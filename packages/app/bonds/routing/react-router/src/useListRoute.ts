/**
 * `useListRoute` over React Router: the list rules come from `@molecule/app-routing`'s
 * `resolveListRoute`, which every framework's `useListRoute` shares.
 *
 * @module
 */

import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { listRouteRedirect, resolveListRoute } from '@molecule/app-routing'

import type { ListRouteOptions, ListRouteResult } from './list-types.js'

/**
 * Own URL-backed pagination, filters and selected views without mirrored state or navigation effects.
 * Works inside `BrowserRouter`, `MemoryRouter` and data routers; no data-router-only
 * `useNavigation` call or MoleculeRouterProvider is needed. Ordinary links, direct visits,
 * and Back/Forward all read the same URL. Page links retain path parameters and unrelated
 * queries; changing filters or views resets the page atomically. Protected views wait for
 * auth and redirect only a confirmed signed-out session, with `state.returnTo` set.
 *
 * @param options - App-owned filter sources, view paths, pagination and optional auth readiness.
 * @returns Reactive list state plus link builders and navigation actions. Gate data queries with `canLoad`.
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: ListRouteOptions<Filter, Selection> = {},
): ListRouteResult<Filter, Selection> {
  const location = useLocation()
  const navigate = useNavigate()
  const routeParams = useParams()
  const list = resolveListRoute<Filter, Selection>(
    { location, routeParams },
    options,
    (path, navOptions) => navigate(path, { replace: navOptions.replace, state: navOptions.state }),
  )
  const redirect = listRouteRedirect(list, location)
  const redirectTo = redirect?.to
  const returnTo = redirect?.options.state.returnTo
  useEffect(() => {
    if (redirectTo === undefined || returnTo === undefined) return
    void navigate(redirectTo, { replace: true, state: { returnTo } })
  }, [navigate, redirectTo, returnTo])
  return list
}
