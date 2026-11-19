import { useRef, useState } from 'react'
import { type Location, type NavigateFunction, type Params, useHref } from 'react-router'

import {
  createReactRouterHistory,
  type ReactRouterHistory,
  type ReactRouterSnapshot,
} from './history.js'

/** The path whose `useHref` gives the prefix React Router puts before every in-app path. */
const HREF_PROBE = '/x'

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
  // React Router writes every in-app path's href as one prefix plus the path, so the href of
  // one probe path gives the prefix for all of them.
  const probe = useHref(HREF_PROBE)
  const rootHref = useHref('/')
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
    hrefPrefix: probe.slice(0, probe.length - HREF_PROBE.length),
    rootHref,
  }
  const [history] = useState(() => createReactRouterHistory(snapshot))
  return history
}
