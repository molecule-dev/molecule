/**
 * The route params of the calling component, from React Router's `useParams`: the hook this
 * bond hands `@molecule/app-react`'s `RouterProvider` as `useRouteParams`, and the params
 * `useMoleculeRouter()` answers with. Not re-exported by the index.
 *
 * React Router scopes params to the matched route: `useParams()` is empty at the router's root,
 * where the molecule router is created, and holds the route's params in its element (a layout
 * route's element sees its child's). So params are read where the component is.
 *
 * @module
 */

import { useState } from 'react'
import { useParams } from 'react-router'

import type { RouteParams } from './types.js'

/**
 * Whether two param maps hold the same entries.
 *
 * @param a - One map.
 * @param b - The other.
 * @returns Whether they are equal.
 */
const sameParams = (a: RouteParams, b: RouteParams): boolean => {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key])
}

/**
 * The params of the route the caller renders in, without the optional segments that matched
 * nothing. The previous object is kept while the entries are the same: React Router builds a
 * new one whenever `<Routes>` re-renders.
 *
 * @returns The params; empty outside every matched route.
 */
export function useNativeRouteParams(): RouteParams {
  const params = useParams()
  const own: RouteParams = {}
  for (const [name, value] of Object.entries(params)) if (value !== undefined) own[name] = value
  const [held, setHeld] = useState(own)
  const current = sameParams(held, own) ? held : own
  if (current !== held) setHeld(current)
  return current
}
