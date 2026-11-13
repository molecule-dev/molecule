/**
 * Angular Router implementation of the molecule `Router`.
 *
 * The bond supplies a {@link RouterHistory} over Angular's `Router` and `Location`;
 * `@molecule/app-routing`'s `createHistoryRouter` builds everything else (guards,
 * named routes, query/hash helpers, matching, subscriptions) on top of it, so this
 * bond behaves exactly like the other routing bonds.
 *
 * @see {@link provideMoleculeRouter} for the Angular provider form.
 *
 * @module
 */

import type { Location } from '@angular/common'
import {
  type ActivatedRouteSnapshot,
  NavigationEnd,
  NavigationStart,
  type Router as AngularRouter,
} from '@angular/router'

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
  parseLocation,
  toHistoryStateRecord,
} from '@molecule/app-routing'

import type { AngularRouterOptions } from './types.js'

/** The `history.state` key this bond keeps each entry's location key under. */
const ENTRY_KEY = '__moleculeKey'

const newKey = (): string => Math.random().toString(36).slice(2)

/**
 * Reads the app's state and this bond's entry key out of a raw `history.state`.
 *
 * Angular stores its own bookkeeping next to whatever state a navigation carried
 * (`navigationId`, plus its `ɵ`-prefixed internals); none of it is the caller's
 * state, so it is stripped. `navigationId` cannot be the location key: Angular
 * rewrites it on every navigation, a Back included.
 *
 * @param state - The raw `Location.getState()` value (`null` before Angular's first
 * navigation, an object Angular wrote afterwards).
 * @returns The app's state part (`undefined` when Angular's keys are all it holds)
 * and the entry's key, when this bond has stamped one.
 */
const readAngularState = (
  state: unknown,
): { userState: Record<string, unknown> | undefined; entryKey?: string } => {
  if (state === null || typeof state !== 'object') return { userState: undefined }
  let userState: Record<string, unknown> | undefined
  let entryKey: string | undefined
  for (const [key, value] of Object.entries(state)) {
    if (key === ENTRY_KEY) entryKey = String(value)
    else if (key !== 'navigationId' && !key.startsWith('ɵ')) (userState ??= {})[key] = value
  }
  return { userState, entryKey }
}

/**
 * Creates a molecule `Router` over the Angular Router.
 *
 * Reads, navigation and notifications all go through Angular itself: `location()`
 * parses `router.url`, `push`/`replace` call `router.navigateByUrl` (returning its
 * promise), `go` calls `location.historyGo`, and `listen` follows `router.events` —
 * one notification per committed navigation (Angular's own links, the back button,
 * or this router's `navigate`), `'pop'` for a popstate navigation, nothing for a
 * cancelled, failed or skipped one. Each committed entry gets a location key in its
 * `history.state`, which Angular carries through Back and Forward, so the key names
 * the entry as React Router's does. Guards, named routes and the query/hash helpers
 * come from `createHistoryRouter`.
 *
 * @param router - Angular's `Router` (inject it, or get it from an `EnvironmentInjector`).
 * @param location - Angular's `Location` over the same history (injected alongside
 * the router; with `provideRouter` it shares the `LocationStrategy` the router uses).
 * @param options - Molecule route definitions for named routes and route params.
 * @returns A molecule `Router` driving the Angular Router.
 *
 * @example
 * ```ts
 * import { createAngularRouter } from '@molecule/app-routing-angular-router'
 *
 * // Inside an injection context (a component or provider factory):
 * const router = createAngularRouter(inject(Router), inject(Location), {
 *   routes: [{ path: '/users/:id', name: 'user' }],
 * })
 * ```
 */
export const createAngularRouter = (
  router: AngularRouter,
  location: Location,
  options: AngularRouterOptions = {},
): Router => {
  // The location, cached per raw state object: `history.state` stays the same object
  // until the entry changes, so reads of one entry return one key and one state.
  let lastRawState: unknown
  let lastKey = 'default'
  let lastUserState: unknown
  const readLocation = (): RouteLocation => {
    const rawState = location.getState()
    if (rawState !== lastRawState) {
      lastRawState = rawState
      const { userState, entryKey } = readAngularState(rawState)
      lastUserState = fromHistoryStateRecord(userState)
      lastKey = entryKey ?? 'default'
    }
    return { ...parseLocation(router.url, lastUserState), key: lastKey }
  }

  // An entry Angular committed without a key (one of its own links, its first
  // navigation) gets one written into its state; a popstate restores the state with
  // the key still in it.
  const stampEntryKey = (): void => {
    const rawState = location.getState()
    if (readAngularState(rawState).entryKey !== undefined) return
    const current = rawState !== null && typeof rawState === 'object' ? rawState : {}
    location.replaceState(location.path(true), '', { ...current, [ENTRY_KEY]: newKey() })
  }

  // The params of the route Angular matched: every snapshot from the root down.
  const readParams = (): RouteParams => {
    const params: RouteParams = {}
    let snapshot: ActivatedRouteSnapshot | null = router.routerState.snapshot.root
    while (snapshot !== null) {
      for (const [key, value] of Object.entries(snapshot.params)) params[key] = value
      snapshot = snapshot.firstChild
    }
    return params
  }

  // NavigationExtras.state is a record that Angular merges its own keys into, so any
  // other value is wrapped by toHistoryStateRecord (and unwrapped when read back).
  // `onSameUrlNavigation: 'reload'` lets a navigation to the current URL still carry
  // its new state, as React Router's does; Angular skips it otherwise.
  const navigateByAngular = async (
    path: string,
    state: unknown,
    replaceUrl: boolean,
  ): Promise<void> => {
    await router.navigateByUrl(path, {
      replaceUrl,
      onSameUrlNavigation: 'reload',
      state: { ...toHistoryStateRecord(state), [ENTRY_KEY]: newKey() },
    })
  }

  // One subscription for the router's life: it stamps each committed entry before any
  // listener reads the location, then notifies. True between a popstate
  // NavigationStart and its NavigationEnd.
  const listeners = new Set<(action?: NavigationAction) => void>()
  let popstate = false
  const events = router.events.subscribe((event) => {
    if (event instanceof NavigationStart) {
      popstate = event.navigationTrigger === 'popstate'
    } else if (event instanceof NavigationEnd) {
      stampEntryKey()
      for (const listener of [...listeners]) listener(popstate ? 'pop' : undefined)
    }
    // NavigationCancel / NavigationError / NavigationSkipped: the navigation did not
    // commit, so no location changed and nobody is notified.
  })
  stampEntryKey()

  const history: RouterHistory = {
    location: readLocation,

    params: readParams,

    push: (path, state) => navigateByAngular(path, state, false),

    replace: (path, state) => navigateByAngular(path, state, true),

    go: (delta) => location.historyGo(delta),

    listen(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    destroy() {
      listeners.clear()
      events.unsubscribe()
    },
  }

  return createHistoryRouter(history, options)
}

/**
 * The conventional typed provider constant.
 *
 * The Angular Router only exists inside a booted injector (`inject(AngularRouter)`,
 * `inject(Location)`), so this constant — resolved at import time, before any app
 * boots — cannot be Angular-backed: it is the core `@molecule/app-routing`
 * {@link createBrowserRouter} (same `Router` interface, plain browser history).
 * Angular apps should NOT wire it; use {@link provideMoleculeRouter} next to
 * `provideRouter(routes)` to get the Angular-backed router.
 */
export const provider: Router = createBrowserRouter()
