/**
 * Solid Router provider implementation.
 *
 * Builds the molecule `Router` from a mounted Solid Router's own primitives
 * (`useLocation`, `useNavigate`, `useParams`) and gets everything else (query and hash
 * helpers, guards, named routes, matching, subscriptions) from
 * `createHistoryRouter`, the same construction every routing bond uses.
 *
 * @module
 */

import { useLocation, useNavigate, useParams } from '@solidjs/router'
import { createEffect, createRoot, on, untrack } from 'solid-js'

import type {
  NavigationAction,
  RouteLocation,
  RouteParams,
  Router,
  RouterHistory,
} from '@molecule/app-routing'
import {
  createBrowserRouter,
  createHistoryRouter,
  fromHistoryStateRecord,
  toHistoryStateRecord,
} from '@molecule/app-routing'

import type { SolidRouterOptions } from './types.js'

/** Origin used only to parse a native history entry into its parts. */
const URL_BASE = 'http://localhost'

/** The parts of a location a path string is parsed into. */
interface PathParts {
  pathname: string
  search: string
  hash: string
}

/** The path of a location: `pathname + search + hash`. */
const pathOf = (parts: PathParts): string => parts.pathname + parts.search + parts.hash

/**
 * Parses a native history entry (`/users/7?x=1#top`) into its path parts, the way Solid
 * Router parses a location against its mock origin.
 *
 * @param value - The entry.
 * @returns The parts.
 */
const parseParts = (value: string): PathParts => {
  const url = new URL(value, URL_BASE)
  return { pathname: url.pathname, search: url.search, hash: url.hash }
}

const newKey = (): string => Math.random().toString(36).slice(2)

/**
 * The key Solid Router's browser integration records its own bookkeeping under in the
 * history state (`keepDepth` tags entries with `_depth`, the browser History API
 * counterpart of Vue Router's `position` or Angular Router's `navigationId`).
 */
const ROUTER_STATE_TAG = '_depth'

/** The `history.state` key this bond keeps each entry's location key under. */
const ENTRY_KEY = '__moleculeKey'

/** Whether `key` is one Solid Router writes into the history state. */
const isSolidRouterKey = (key: string): boolean => key === ROUTER_STATE_TAG

/** The state and key of the current entry. */
interface Entry {
  state: unknown
  key: string
}

/**
 * Reads an entry's stored state: the app's state without Solid Router's `_depth`, and
 * the key this bond wrote into it (`default` for an entry it has not stamped yet).
 *
 * @param raw - `window.history.state`, or the state a memory history entry holds.
 * @returns The entry.
 */
const readStoredEntry = (raw: unknown): Entry => {
  if (raw === null || typeof raw !== 'object') return { state: raw ?? undefined, key: 'default' }
  const rest = Object.fromEntries(
    Object.entries(raw).filter(([name]) => name !== ENTRY_KEY && !isSolidRouterKey(name)),
  )
  const stamped: unknown = ENTRY_KEY in raw ? raw[ENTRY_KEY] : undefined
  return {
    state: fromHistoryStateRecord(Object.keys(rest).length > 0 ? rest : undefined),
    key: typeof stamped === 'string' ? stamped : 'default',
  }
}

/**
 * The state a navigation through this router writes: any value the browser can store
 * (wrapped by `toHistoryStateRecord` when it is not a plain object, or uses Solid
 * Router's `_depth`), plus a new entry key.
 *
 * @param state - The navigation's state.
 * @returns The history state to write.
 */
const entryState = (state: unknown): Record<string, unknown> => ({
  ...toHistoryStateRecord(state, isSolidRouterKey),
  [ENTRY_KEY]: newKey(),
})

/**
 * Creates a molecule `Router` over the Solid Router the call sits inside.
 *
 * Call it inside a Solid Router context — a component under `<Router>`, `<HashRouter>`
 * or `<MemoryRouter>`, typically the router's `root` component — and bond the result so
 * every molecule package shares the native router:
 *
 * @example
 * ```tsx
 * import { Router } from '@solidjs/router'
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { createSolidRouter } from '@molecule/app-routing-solid-router'
 *
 * <Router root={(props) => (
 *   <MoleculeProvider config={{ router: createSolidRouter() }}>{props.children}</MoleculeProvider>
 * )}>
 *   <Route path="/users/:id" component={User} />
 * </Router>
 * ```
 *
 * A Solid Router reports no navigation action and no entry key, and its memory router
 * keeps no state, so the bond tracks both itself. Browser histories (`<Router>`,
 * `<HashRouter>`) keep each entry's state and key in `history.state` and report pops
 * through `popstate`. A memory router needs the history from
 * {@link createSolidMemoryHistory}, passed to both `<MemoryRouter history={memory}>` and
 * `options.history`.
 *
 * @param options - Route definitions and, for a memory router, its history.
 * @returns A molecule `Router` driving that Solid Router.
 */
export const createSolidRouter = (options: SolidRouterOptions = {}): Router => {
  const { routes, history: memoryHistory } = options
  const location = useLocation()
  const navigate = useNavigate()
  const nativeParams = useParams()
  const onWindow = !memoryHistory && typeof window !== 'undefined'

  /** The Solid Router's current path, tracked (an effect reading it re-runs on change). */
  const trackedPath = (): string =>
    pathOf({ pathname: location.pathname, search: location.search, hash: location.hash })

  // An entry's stored state is the same object until the entry changes; so is what it
  // reads as. A memory history keys each entry itself.
  let lastRaw: unknown
  let lastKey: string | undefined
  let lastEntry: Entry = { state: undefined, key: 'default' }
  const readEntry = (): Entry => {
    const memoryEntry = memoryHistory?.entry()
    const raw: unknown = memoryEntry ? memoryEntry.state : onWindow ? window.history.state : null
    if (raw !== lastRaw || memoryEntry?.key !== lastKey) {
      lastRaw = raw
      lastKey = memoryEntry?.key
      const stored = readStoredEntry(raw)
      lastEntry = memoryEntry ? { state: stored.state, key: memoryEntry.key } : stored
    }
    return lastEntry
  }

  // An entry Solid Router committed without a key (one of its own links, the page load)
  // gets one; Back and Forward bring the entry's state back with the key in it.
  const stampEntryKey = (): void => {
    if (!onWindow) return
    const raw: unknown = window.history.state
    const current = raw !== null && typeof raw === 'object' ? raw : {}
    if (ENTRY_KEY in current) return
    window.history.replaceState({ ...current, [ENTRY_KEY]: newKey() }, '')
  }

  // Pops: a browser history's `popstate`, or a memory history's move, fires before the
  // Solid location catches up; a move whose target the location has not committed yet is
  // a pop. Navigations started through the router commit the location first, so their
  // notifications name their own target and are not pops.
  const listeners = new Set<(action?: NavigationAction) => void>()
  let pendingPop: string | null = null
  const onHistoryMove = (value?: string): void => {
    const target =
      value !== undefined ? pathOf(parseParts(value)) : onWindow ? pathOf(window.location) : null
    if (target === null || target === untrack(trackedPath)) return
    pendingPop = target
  }
  const onPopState = (): void => onHistoryMove()
  if (onWindow) window.addEventListener('popstate', onPopState)
  const stopMemoryHistory = memoryHistory ? memoryHistory.listen(onHistoryMove) : null

  // One effect for the router's life: it stamps each committed entry before any listener
  // reads the location, then notifies.
  stampEntryKey()
  let disposeRoot: () => void = () => undefined
  createRoot((dispose) => {
    disposeRoot = dispose
    createEffect(
      on(
        trackedPath,
        (current) => {
          const action: NavigationAction | undefined =
            pendingPop !== null && pendingPop === current ? 'pop' : undefined
          pendingPop = null
          if (action === undefined) stampEntryKey()
          for (const listener of [...listeners]) listener(action)
        },
        { defer: true },
      ),
    )
  })

  const history: RouterHistory = {
    /**
     * Reads the native router's location at the time of the call.
     *
     * @returns The location, with the state and key of its history entry.
     */
    location(): RouteLocation {
      const { state, key } = readEntry()
      return {
        pathname: untrack(() => location.pathname),
        search: untrack(() => location.search),
        hash: untrack(() => location.hash),
        state,
        key,
      }
    },

    /**
     * The params of the route the native router matched (its merged router-level
     * params). Keys whose value is `undefined` (Solid Router's optional segments) are
     * dropped: the molecule `RouteParams` values are strings.
     *
     * @returns A plain copy of the native params.
     */
    params: () =>
      untrack(() => {
        const copy: RouteParams = {}
        for (const [name, value] of Object.entries(nativeParams)) {
          if (typeof value === 'string') copy[name] = value
        }
        return copy
      }),

    push: (path, state) => navigate(path, { state: entryState(state) }),

    replace: (path, state) => navigate(path, { replace: true, state: entryState(state) }),

    // A numeric target is Solid Router's own history move: `navigateFromRoute` routes it
    // through the integration's `go` (`memoryHistory.go`, `window.history.go`).
    go: (delta) => navigate(delta),

    /**
     * Calls `listener` once per committed navigation of the native router, `'pop'` for a
     * Back/Forward move and no action for the rest (the router answers its own action).
     *
     * @param listener - The listener.
     * @returns A function that unsubscribes it.
     */
    listen(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    destroy() {
      listeners.clear()
      disposeRoot()
      if (onWindow) window.removeEventListener('popstate', onPopState)
      stopMemoryHistory?.()
      pendingPop = null
    },
  }

  return createHistoryRouter(history, { routes })
}

/**
 * Typed provider constant for the bond registry.
 *
 * A Solid Router needs a component context (`useLocation` and friends read it), so no
 * router can be built at import time: `provider` is `@molecule/app-routing`'s own
 * browser router, correct only where no Solid Router is mounted. Wire
 * `createSolidRouter()` from a component under the router instead (see its example).
 */
export const provider: Router = createBrowserRouter()
