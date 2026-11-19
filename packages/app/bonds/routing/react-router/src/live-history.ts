import { useRef, useState } from 'react'
import type { Location, NavigateFunction, Params } from 'react-router'

import {
  createReactRouterHistory,
  type ReactRouterHistory,
  type ReactRouterSnapshot,
} from './history.js'

/**
 * The live history of the calling component. It reads a mirror of React Router's values that
 * this hook rewrites in every render, because components below read the router while rendering.
 */
export function useLiveHistory(current: {
  navigate: NavigateFunction
  location: Location
  params: Params
}): ReactRouterHistory {
  const { navigate, location, params } = current
  const snapshot = useRef<ReactRouterSnapshot>(undefined)
  snapshot.current = {
    navigate,
    location: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      key: location.key,
    },
    params,
  }
  const [history] = useState(() => createReactRouterHistory(snapshot))
  return history
}
