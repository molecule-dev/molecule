/**
 * The Vue Router instance as a molecule {@link RouterHistory}.
 *
 * `createVueRouter` hands this to `createHistoryRouter`, which builds the whole molecule
 * `Router` from it — the same construction every routing bond uses.
 *
 * @module
 */

import type {
  HistoryState,
  NavigationHookAfter,
  RouteLocationRaw,
  Router as VueRouterInstance,
} from 'vue-router'

import type {
  NavigationAction,
  RouteLocation,
  RouteParams,
  RouterHistory,
} from '@molecule/app-routing'
import { fromHistoryStateRecord, toHistoryStateRecord } from '@molecule/app-routing'

import { normalizeParams } from './utilities.js'

/**
 * The keys Vue Router itself writes into every history entry
 * (`{ back, current, forward, position, replaced, scroll }`). They are stripped before a
 * location's `state` is reported, so apps only ever see the state they passed.
 */
const VUE_ROUTER_STATE_KEYS = ['back', 'current', 'forward', 'position', 'replaced', 'scroll']

/** The `history.state` key this bond keeps each entry's location key under. */
const ENTRY_KEY = '__moleculeKey'

const newKey = (): string => Math.random().toString(36).slice(2)

/**
 * Reads the live history entry state. `window.history.state` is the source of truth (the
 * bond merges caller state into the entry after Vue Router navigated, and only the browser
 * carries that); off the browser (a Vue Router memory history in SSR or tests) the Vue
 * Router's own state mirror is read instead.
 *
 * @param router - The Vue Router instance.
 * @returns The raw entry state, or `undefined` when there is none.
 */
const rawState = (router: VueRouterInstance): HistoryState | null | undefined => {
  if (typeof window !== 'undefined') return window.history.state as HistoryState | null
  return router.options.history.state
}

/**
 * Strips Vue Router's own keys from an entry state and keeps what the app passed. Returns
 * `undefined` when nothing is left (or there was no state), so `location().state` is never
 * Vue Router's bookkeeping.
 *
 * @param state - The raw entry state.
 * @returns The app's state, or `undefined`.
 */
const appStateOf = (state: HistoryState | null | undefined): unknown => {
  if (state === null || typeof state !== 'object') return undefined
  const rest: Record<string, unknown> = { ...state }
  for (const key of [...VUE_ROUTER_STATE_KEYS, ENTRY_KEY]) delete rest[key]
  return fromHistoryStateRecord(Object.keys(rest).length > 0 ? rest : undefined)
}

/**
 * The entry's location key: the one this bond wrote into it, which Back and Forward
 * bring back with the entry. Off the browser (no entry to write into) it is Vue
 * Router's entry `position` plus the `fullPath` it holds.
 *
 * @param fullPath - The entry's path, query string and hash.
 * @param state - The raw entry state.
 * @returns The entry key.
 */
const keyOf = (fullPath: string, state: HistoryState | null | undefined): string => {
  const stamped = state?.[ENTRY_KEY]
  if (typeof stamped === 'string') return stamped
  return `${typeof state?.position === 'number' ? state.position : 'initial'}|${fullPath}`
}

/**
 * Splits a `fullPath` into its query string (with the leading `?`, or `''`), reading the
 * part before the hash so a path like `/a?b=1#c` is not misread.
 *
 * @param fullPath - The Vue Router route's `fullPath`.
 * @returns The query string, or `''`.
 */
const searchOf = (fullPath: string): string => {
  const hashIndex = fullPath.indexOf('#')
  const beforeHash = hashIndex === -1 ? fullPath : fullPath.slice(0, hashIndex)
  const queryIndex = beforeHash.indexOf('?')
  return queryIndex === -1 ? '' : beforeHash.slice(queryIndex)
}

/** Whether `key` is one Vue Router writes into its entries. */
const isVueRouterKey = (key: string): boolean => VUE_ROUTER_STATE_KEYS.includes(key)

/**
 * Writes a new entry key into the history entry Vue Router just committed (a
 * `replaceState`, which changes no URL and adds no entry), plus the state when the
 * navigation was made through this router. Vue Router itself writes only its own
 * bookkeeping, and its `replace` carries the old entry's keys over, so a navigation of
 * this router keeps only Vue Router's keys from the entry. A value that is not a plain
 * object, or that uses one of Vue Router's keys, is wrapped by `toHistoryStateRecord`.
 *
 * @param own - The state of a navigation this router made, or `undefined` for one it
 * did not make (that entry keeps whatever state it has).
 */
const stampEntry = (own: { state: unknown } | undefined): void => {
  if (typeof window === 'undefined') return
  const entry: unknown = window.history.state
  const current = entry !== null && typeof entry === 'object' ? entry : {}
  const kept = own
    ? Object.fromEntries(Object.entries(current).filter(([key]) => isVueRouterKey(key)))
    : current
  const appState = own ? toHistoryStateRecord(own.state, isVueRouterKey) : undefined
  window.history.replaceState({ ...kept, ...appState, [ENTRY_KEY]: newKey() }, '')
}

/**
 * Builds a molecule {@link RouterHistory} over a Vue Router instance, for
 * `createHistoryRouter(vueRouterHistory(router), { routes })`.
 *
 * The location is read from the router's live `currentRoute` at every call, navigations go
 * through `router.push`/`replace`/`go`, and listeners hear every navigation Vue Router
 * commits — its own links, the browser's back button, and pushes made through the molecule
 * router — exactly once each. Navigations Vue Router refused (a cancelled or duplicated
 * navigation, reported to `afterEach` as a `failure`) notify nothing.
 *
 * @param router - The Vue Router instance (from `createRouter` or `useRouter`).
 * @returns The history for {@link createHistoryRouter}.
 */
export const vueRouterHistory = (router: VueRouterInstance): RouterHistory => {
  /** Set by a history move (`type: 'pop'`), so the next `afterEach` reports `'pop'`. */
  let pendingPop = false
  /** The state of the navigation this router has in flight, until Vue Router settles it. */
  let pendingOwn: { state: unknown } | undefined
  const listeners = new Set<(action?: NavigationAction) => void>()

  // Registered once, before any listener: the history listener hears only moves the
  // browser itself made (back/forward), every one of them a pop.
  const stopHistory = router.options.history.listen((_to, _from, info) => {
    if (info.type === 'pop') pendingPop = true
  })
  // The first afterEach hook: the entry is committed by now, so its key and state are
  // written before a listener reads the location. A pop restores an entry that already
  // has both.
  const after: NavigationHookAfter = (_to, _from, failure) => {
    const pop = pendingPop
    const own = pendingOwn
    pendingPop = false
    pendingOwn = undefined
    // `failure` marks a navigation Vue Router refused (its own guard cancelled it, or it
    // duplicated the current location): not a commit, so nobody is notified.
    if (failure) return
    if (!pop) stampEntry(own)
    for (const listener of [...listeners]) listener(pop ? 'pop' : undefined)
  }
  const stopAfter = router.afterEach(after)
  // The entry the router starts on keeps a key it already has (a reload, a second router).
  const initial: unknown = typeof window === 'undefined' ? undefined : window.history.state
  if (initial === null || typeof initial !== 'object' || !(ENTRY_KEY in initial)) {
    stampEntry(undefined)
  }

  const location = (): RouteLocation => {
    const route = router.currentRoute.value
    const state = rawState(router)
    return {
      pathname: route.path,
      search: searchOf(route.fullPath),
      hash: route.hash,
      state: appStateOf(state),
      key: keyOf(route.fullPath, state),
    }
  }

  // Vue Router refuses a navigation to the location it is at (a "duplicated" failure);
  // React Router performs it, so its new state lands. `force` makes Vue Router do the same.
  const targetOf = (path: string): RouteLocationRaw => {
    const resolved = router.resolve(path)
    if (resolved.fullPath !== router.currentRoute.value.fullPath) return path
    return { path: resolved.path, query: resolved.query, hash: resolved.hash, force: true }
  }

  const commit = async (
    path: string,
    state: unknown,
    navigate: (target: RouteLocationRaw) => Promise<unknown>,
  ): Promise<void> => {
    pendingOwn = { state }
    await navigate(targetOf(path))
  }

  return {
    location,
    params: (): RouteParams => normalizeParams(router.currentRoute.value.params),
    push: (path, state) => commit(path, state, (target) => router.push(target)),
    replace: (path, state) => commit(path, state, (target) => router.replace(target)),
    go: (delta) => router.go(delta),
    listen(listener: (action?: NavigationAction) => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    destroy(): void {
      listeners.clear()
      stopHistory()
      stopAfter()
      pendingPop = false
      pendingOwn = undefined
    },
  }
}
