/**
 * The two `RouterHistory` implementations this bond hands to `@molecule/app-routing`'s
 * `createHistoryRouter`: the live history that reads React Router through the hooks of a
 * mounted component (`MoleculeRouterProvider`, `useMoleculeRouter`), and the snapshot
 * history `createReactRouter` builds from its config.
 *
 * @module
 */

import type { NavigateFunction } from 'react-router'

import { I18nError } from '@molecule/app-i18n'
import type { NavigationAction, RouterHistory } from '@molecule/app-routing'

import type { ReactRouterConfig, RouteLocation, RouteParams } from './types.js'

/**
 * The React Router values one render holds, as a {@link ReactRouterHistory} reads them.
 * The component that owns the history replaces this on every render with its latest
 * `useNavigate()`, `useLocation()` and `useParams()` values.
 */
export interface ReactRouterSnapshot {
  /**
   * The `useNavigate()` function of the render.
   */
  navigate: NavigateFunction

  /**
   * The `useLocation()` value of the render.
   */
  location: {
    pathname: string
    search: string
    hash: string
    state?: unknown
    key?: string
  }

  /**
   * The `useParams()` value of the render; empty above any matched `<Route>`.
   */
  params: Record<string, string | undefined>
}

/**
 * Holds the latest {@link ReactRouterSnapshot}; a component's `useRef` satisfies it.
 */
export interface ReactRouterSnapshotRef {
  /**
   * The latest render's snapshot, or nothing before the first render.
   */
  current: ReactRouterSnapshot | undefined
}

/**
 * A live {@link RouterHistory} plus the one call a component's commit effect makes:
 * React Router has committed `action`, so every subscriber registered through `listen`
 * hears it once.
 */
export interface ReactRouterHistory extends RouterHistory {
  /**
   * Reports a committed navigation to every `listen` subscriber.
   *
   * @param action - The action React Router committed the entry with.
   */
  notify(action: NavigationAction): void
}

const newHistoryKey = (): string => Math.random().toString(36).slice(2)

/**
 * Builds the live history a mounted component owns: it reads the latest
 * {@link ReactRouterSnapshot} the component wrote, navigates through that render's
 * `useNavigate()`, and its `listen` registry is notified by the component's effect after
 * React Router commits a navigation (its own links, the back button, or a navigation
 * this router started).
 *
 * @param snapshot - The component's ref, replaced on every render.
 * @returns The history with its {@link ReactRouterHistory.notify} entry.
 */
export const createReactRouterHistory = (snapshot: ReactRouterSnapshotRef): ReactRouterHistory => {
  const listeners = new Set<(action?: NavigationAction) => void>()

  const requireSnapshot = (): ReactRouterSnapshot => {
    const current = snapshot.current
    if (!current) {
      throw new I18nError(
        'routing.error.reactRouterHistoryBeforeRender',
        undefined,
        'The React Router history was used before its component rendered. Mount it inside a React Router router through MoleculeRouterProvider or useMoleculeRouter.',
      )
    }
    return current
  }

  const matchedParams = (): RouteParams | undefined => {
    const matched: RouteParams = {}
    for (const [name, value] of Object.entries(snapshot.current?.params ?? {})) {
      if (value !== undefined) matched[name] = value
    }
    return Object.keys(matched).length > 0 ? matched : undefined
  }

  // Above any matched `<Route>`, `useParams()` is empty, and it stays empty (or stays
  // readable, inside one) for the component's whole life — a component never moves
  // between positions in the route tree. So whether the history carries native params is
  // decided once, at creation: with an empty `useParams()` it reports none, and
  // `createHistoryRouter` then matches the registered route definitions instead.
  const nativeParams = matchedParams()

  const history: ReactRouterHistory = {
    location: (): RouteLocation => {
      const current = snapshot.current
      if (!current) return { pathname: '/', search: '', hash: '' }
      return {
        pathname: current.location.pathname,
        search: current.location.search,
        hash: current.location.hash,
        // React Router models "no state" as `null`; the molecule location leaves it
        // `undefined`, so a stateless entry and an absent state read the same.
        state: current.location.state ?? undefined,
        key: current.location.key,
      }
    },

    push: (path, state) => requireSnapshot().navigate(path, { replace: false, state }),

    replace: (path, state) => requireSnapshot().navigate(path, { replace: true, state }),

    go: (delta) => requireSnapshot().navigate(delta),

    listen: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    notify: (action) => {
      for (const listener of [...listeners]) listener(action)
    },

    destroy: () => {
      listeners.clear()
    },
  }

  if (nativeParams) {
    history.params = (): RouteParams => {
      const matched = matchedParams()
      // Presence was decided at creation and cannot flip, so this answers with a match.
      return matched ?? nativeParams
    }
  }

  return history
}

/**
 * Builds the history `createReactRouter` runs on: it navigates through the configured
 * React Router `navigate` (falling back to `window.location` for the hook-less
 * `provider`), reads the configured location/params snapshot, and reports each
 * navigation itself — a snapshot has no router that could report back.
 *
 * @param config - The `createReactRouter` config.
 * @returns The history.
 */
export const createReactRouterSnapshotHistory = (config: ReactRouterConfig): RouterHistory => {
  const { navigate: navigateFn, location: snapshotLocation, params } = config
  const listeners = new Set<(action?: NavigationAction) => void>()
  let key = newHistoryKey()

  const location = (): RouteLocation => {
    if (snapshotLocation) {
      return {
        pathname: snapshotLocation.pathname,
        search: snapshotLocation.search,
        hash: snapshotLocation.hash,
        // Same normalization as the live history: no state reads as `undefined`.
        state: snapshotLocation.state ?? undefined,
        key: snapshotLocation.key ?? key,
      }
    }
    if (typeof window !== 'undefined') {
      return {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        state: window.history.state ?? undefined,
        key,
      }
    }
    return { pathname: '/', search: '', hash: '', key }
  }

  const paramsOf = (): RouteParams => {
    const normalized: RouteParams = {}
    for (const [name, value] of Object.entries(params ?? {})) {
      if (value !== undefined) normalized[name] = value
    }
    return normalized
  }

  const report = (action: NavigationAction): void => {
    key = newHistoryKey()
    for (const listener of [...listeners]) listener(action)
  }

  const navigateSnapshot = (path: string, replace: boolean, state: unknown): void => {
    if (navigateFn) {
      navigateFn(path, { replace, state })
    } else if (typeof window !== 'undefined') {
      // The hook-less fallback the package has always had: a full-page navigation.
      if (replace) window.location.replace(path)
      else window.location.href = path
    }
  }

  const history: RouterHistory = {
    location,
    push: (path, state) => {
      navigateSnapshot(path, false, state)
      report('push')
    },
    replace: (path, state) => {
      navigateSnapshot(path, true, state)
      report('replace')
    },
    go: (delta) => {
      if (navigateFn) {
        navigateFn(delta)
        report('pop')
      } else if (typeof window !== 'undefined') {
        // The core's back()/forward() arrive as the ±1 moves, which window history
        // names `back` and `forward`; any other delta goes through `go` itself.
        if (delta === -1) window.history.back()
        else if (delta === 1) window.history.forward()
        else window.history.go(delta)
        report('pop')
      }
    },
    listen: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    destroy: () => {
      listeners.clear()
    },
  }

  // Without configured params the history reports none, and `createHistoryRouter` falls
  // back to matching the registered route definitions.
  if (params) history.params = paramsOf
  return history
}
