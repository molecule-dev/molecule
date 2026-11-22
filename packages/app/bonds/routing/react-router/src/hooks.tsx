/**
 * React hooks for React Router integration.
 *
 * @module
 */

import React, {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  type NavigationType,
  useInRouterContext,
  useLocation,
  useNavigate,
  useNavigationType,
  useParams,
} from 'react-router'

import { I18nError } from '@molecule/app-i18n'
import {
  type ConsumedSearchParam,
  createConsumedSearchParam,
  createHistoryRouter,
  matchPath,
  type NavigationAction,
  parseQuery,
  setRouter,
} from '@molecule/app-routing'

import type { ReactRouterHistory } from './history.js'
import { useLiveHistory } from './live-history.js'
import { useNativeRouteParams } from './route-params.js'
import { MoleculeRouterContext, ProvideMoleculeRouter } from './router-context.js'
import type { QueryParams, RouteDefinition, RouteParams, Router } from './types.js'

// Runs after React commits and before the browser paints: the bond happens before pages run
// their effects (a page's effect may call `getRouter()`, and an inner provider's
// `onRouterReady` runs before an outer provider's effects), and subscribers hear a navigation
// before its page is painted. `useEffect` on the server, where layout effects do not run.
const useBeforePaintEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** The route arrays already registered on each router, so one array registers once. */
const registeredRouteArrays = new WeakMap<Router, Set<RouteDefinition[]>>()

/**
 * Registers `routes` on `router` unless this array already is: a render may run twice (React
 * StrictMode) and a provider renders on every navigation.
 *
 * @param router - The router.
 * @param routes - Route definitions.
 */
const registerRoutesOnce = (router: Router, routes: RouteDefinition[]): void => {
  const registered = registeredRouteArrays.get(router) ?? new Set<RouteDefinition[]>()
  registeredRouteArrays.set(router, registered)
  if (registered.has(routes)) return
  registered.add(routes)
  router.registerRoutes(routes)
}

/**
 * Provider props.
 */
export interface MoleculeRouterProviderProps {
  /**
   * Child components.
   */
  children: ReactNode

  /**
   * Optional route definitions for named routes.
   */
  routes?: RouteDefinition[]

  /**
   * Callback when router is ready.
   */
  onRouterReady?: (router: Router) => void
}

/**
 * Maps React Router's navigation type to the molecule action.
 *
 * @param navigationType - The `useNavigationType()` value of the committed render.
 * @returns The molecule `NavigationAction` for it.
 */
const navigationTypeToAction = (navigationType: NavigationType): NavigationAction => {
  if (navigationType === 'POP') return 'pop'
  if (navigationType === 'REPLACE') return 'replace'
  return 'push'
}

/**
 * Notifies the live history's subscribers once after each navigation React Router
 * commits, however it started — a link, the back button, or a navigation through the
 * molecule router. It runs in a layout effect, after the commit that shows the new page and
 * before the browser paints it, and React renders what a subscriber schedules there before
 * that paint: a component that reads the router (`@molecule/app-react`'s hooks) shows the
 * new location in the same paint as the new page. It is keyed on the location key, so a key
 * React Router already reported (a StrictMode replay) is not reported twice, and the first
 * run — the mount — reports nothing.
 *
 * @param history - The component's live history; `null` skips (a provider's router is already notified by the provider).
 * @param locationKey - The location key of the committed render.
 * @param navigationType - How React Router reached the current entry.
 */
function useNotifyCommittedNavigation(
  history: ReactRouterHistory | null,
  locationKey: string,
  navigationType: NavigationType,
): void {
  const lastNotifiedKey = useRef<string | undefined>(undefined)

  useBeforePaintEffect(() => {
    if (!history || lastNotifiedKey.current === locationKey) return
    const firstNotification = lastNotifiedKey.current === undefined
    lastNotifiedKey.current = locationKey
    if (firstNotification) return
    history.notify(navigationTypeToAction(navigationType))
  }, [history, locationKey, navigationType])
}

/**
 * Builds the component-owned molecule router on the live history: the router is created
 * once for the component's whole life, and the history reads a ref that every render
 * refreshes with the latest `useNavigate()`/`useLocation()`/`useParams()`/
 * `useNavigationType()` values, so its reads always answer for the committed render.
 *
 * @param routes - Route definitions the router is created with; later ones register through `router.registerRoutes`.
 * @returns The router, its live history, and the committed location key with the navigation type of this render.
 */
function useMoleculeRouterInstance(routes: RouteDefinition[]): {
  router: Router
  history: ReactRouterHistory
  locationKey: string
  navigationType: NavigationType
} {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const navigationType = useNavigationType()

  const history = useLiveHistory({ navigate, location, params })
  const [router] = useState(() => createHistoryRouter(history, { routes }))

  return { router, history, locationKey: location.key, navigationType }
}

/**
 * Provider component that creates ONE molecule Router over React Router for its whole
 * mounted life and bonds it as the active singleton via `@molecule/app-routing`'s
 * `setRouter`. Subscribers and guards registered on the router survive navigation:
 * `@molecule/app-routing`'s `getRouter()` keeps returning it, `onRouterReady` fires once,
 * and React Router's own links and the back button reach `router.subscribe()`. It also
 * renders `@molecule/app-react`'s `RouterProvider` with the router and React Router's `Outlet`
 * as the routed view, so that binding's routing hooks and `RoutedView` work.
 *
 * This bond's `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` and
 * `unstable_HistoryRouter` already render one around their children, and its data-router
 * `RouterProvider`s build the molecule router from the data router they are given. Mount it
 * yourself for named routes or `onRouterReady`, or under React Router's own router components;
 * in framework mode (`HydratedRouter`), mount it in the root route. Inside another one it
 * creates no second router: it registers its `routes` on the outer router and calls
 * `onRouterReady` with it.
 *
 * Bonding happens in a layout effect on mount, before the pages' effects run, so
 * `@molecule/app-routing`'s `navigate()`/`getRouter()` drive THIS real React Router adapter.
 *
 * @param props - The provider props (see {@link MoleculeRouterProviderProps}):
 *   `children` (rendered inside the router context), `routes` (optional named-route
 *   definitions; pass a stable array — later identities register onto the same router),
 *   and `onRouterReady` (optional callback invoked ONCE with the router after it is
 *   bonded, e.g. to register guards — bonding via `setRouter` happens regardless).
 * @returns The rendered provider wrapping children with the router context.
 * @example
 * ```tsx
 * import { Routes, Route } from 'react-router'
 * import { BrowserRouter, MoleculeRouterProvider } from '@molecule/app-routing-react-router'
 *
 * function App() {
 *   // Bonds automatically — molecule packages' navigate() now drive React Router.
 *   return (
 *     <BrowserRouter>
 *       <MoleculeRouterProvider>
 *         <Routes>
 *           <Route path="/" element={<Home />} />
 *           <Route path="/users/:id" element={<UserProfile />} />
 *         </Routes>
 *       </MoleculeRouterProvider>
 *     </BrowserRouter>
 *   )
 * }
 * ```
 */
export function MoleculeRouterProvider(props: MoleculeRouterProviderProps): React.JSX.Element {
  // One router per React Router tree: a second provider would bond a second router over the
  // first (and, as a parent's effects run after its children's, the outer one would win and
  // the inner one's named routes would be lost).
  const outer = useContext(MoleculeRouterContext)
  return outer ? <JoinedRouter {...props} router={outer} /> : <OwnedRouter {...props} />
}

/**
 * Calls `onRouterReady` once per router, with the callback of the render that first saw it.
 *
 * @param router - The router.
 * @param onRouterReady - The provider's callback.
 */
function useRouterReady(
  router: Router,
  onRouterReady: ((router: Router) => void) | undefined,
): void {
  const readyRouter = useRef<Router | null>(null)
  useEffect(() => {
    // A later callback identity is not a new router.
    if (readyRouter.current === router) return
    readyRouter.current = router
    onRouterReady?.(router)
  }, [router, onRouterReady])
}

/**
 * A provider inside another: its routes go on the outer router, registered as it renders so
 * the children's first render can navigate by name, and `onRouterReady` gets the outer router.
 *
 * @param props - The provider props, with the outer provider's router.
 * @returns The children.
 */
function JoinedRouter(props: MoleculeRouterProviderProps & { router: Router }): React.JSX.Element {
  const { router, routes, onRouterReady, children } = props
  if (routes && routes.length > 0) registerRoutesOnce(router, routes)
  useRouterReady(router, onRouterReady)
  return <>{children}</>
}

/**
 * The outermost provider: creates the tree's router, bonds it and provides it.
 *
 * @param props - The provider props.
 * @returns The providers around the children.
 */
function OwnedRouter(props: MoleculeRouterProviderProps): React.JSX.Element {
  const { children, routes = [], onRouterReady } = props
  const { router, history, locationKey, navigationType } = useMoleculeRouterInstance(routes)

  useBeforePaintEffect(() => {
    // Bonded once per router: `@molecule/app-routing`'s navigate()/getRouter() drive THIS
    // real React Router adapter for the provider's whole life.
    setRouter(router)
  }, [router])

  useRouterReady(router, onRouterReady)

  const registeredRoutes = useRef(routes)
  useEffect(() => {
    // The routes the router was created with are already registered; a later array
    // registers onto THIS router instead of replacing it.
    if (registeredRoutes.current === routes) return
    registeredRoutes.current = routes
    router.registerRoutes(routes)
  }, [routes, router])

  useNotifyCommittedNavigation(history, locationKey, navigationType)

  return <ProvideMoleculeRouter router={router}>{children}</ProvideMoleculeRouter>
}

/**
 * Throws unless the caller renders inside a React Router router.
 *
 * @throws {Error} If used outside a React Router router; mount a router component.
 */
function useRequiredRouterContext(): void {
  const inRouter = useInRouterContext()
  if (!inRouter) {
    // Thrown like the package's other errors: the key travels with the English message
    // and is translated wherever the error is shown.
    throw new I18nError(
      'routing.error.useMoleculeRouterOutsideRouter',
      undefined,
      '`useMoleculeRouter` must be used within a React Router router. Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, or `RouterProvider`.',
    )
  }
}

/**
 * Hook to get the molecule Router inside any React Router router, including
 * BrowserRouter, HashRouter, MemoryRouter, Router, or RouterProvider from this
 * package or React Router itself. No MoleculeRouterProvider is required.
 *
 * Under a provider (every router component of this package renders one), returns that
 * router as the calling component sees it: `getParams()` answers with the params of the
 * route the component renders in (React Router's `useParams`), and everything else —
 * location, navigation, subscribers, guards, named routes — is the provider's router. The
 * object stays the same for the component's life, but it is not `===` `getRouter()`. Under
 * React Router's own router components with no provider, creates ONE router for the calling
 * component's whole life — its location, params and queries follow React Router through
 * every navigation, and `subscribe()` hears React Router's own links and the back button —
 * without bonding it globally.
 *
 * @returns The molecule Router instance
 * @throws {Error} If used outside a React Router router; mount a router component.
 *
 * @example
 * ```tsx
 * function NavigationButton() {
 *   const router = useMoleculeRouter()
 *
 *   return (
 *     <button onClick={() => router.navigate('/dashboard')}>
 *       Go to Dashboard
 *     </button>
 *   )
 * }
 * ```
 */
export function useMoleculeRouter(): Router {
  const provided = useContext(MoleculeRouterContext)
  useRequiredRouterContext()

  const {
    router: localRouter,
    history,
    locationKey,
    navigationType,
  } = useMoleculeRouterInstance([])
  // The provider's router notifies through the provider; a locally created one is idle.
  useNotifyCommittedNavigation(provided ? null : history, locationKey, navigationType)
  const base = provided ?? localRouter

  // The component's own route params, rewritten each render: the view below reads the latest.
  const ownParams = useRef<RouteParams>({})
  ownParams.current = useNativeRouteParams()
  const [view, setView] = useState(() => ({ base, router: routerAsSeenBy(base, ownParams) }))
  const current = view.base === base ? view : { base, router: routerAsSeenBy(base, ownParams) }
  if (current !== view) setView(current)
  return current.router
}

/**
 * `base` as one component sees it: its `getParams()` answers with the component's own route
 * params when it has any, otherwise `base`'s. A copy, not a prototype: a router is spread
 * elsewhere (`retainingHistoryState`), which would drop inherited methods, and a router's
 * methods close over its state, so the copy drives the same router.
 *
 * @param base - The tree's (or the component's local) router.
 * @param ownParams - The component's latest route params.
 * @returns The view.
 */
function routerAsSeenBy(base: Router, ownParams: { current: RouteParams }): Router {
  return {
    ...base,
    getParams: <T extends RouteParams = RouteParams>(): T =>
      Object.keys(ownParams.current).length > 0 ? (ownParams.current as T) : base.getParams<T>(),
  }
}

/**
 * Hook to check if a path is currently active inside any React Router router.
 * MoleculeRouterProvider is optional; mount it only for named routes, the
 * non-React navigate()/getRouter() bond, or onRouterReady.
 *
 * @param path - Path to check
 * @param exact - Whether to require exact match
 * @returns Whether the path is active
 *
 * @example
 * ```tsx
 * function NavLink({ to, children }) {
 *   const isActive = useIsActive(to)
 *   return (
 *     <a href={to} className={isActive ? 'active' : ''}>
 *       {children}
 *     </a>
 *   )
 * }
 * ```
 */
export function useIsActive(path: string, exact?: boolean): boolean {
  useRequiredRouterContext()
  const { pathname } = useLocation()
  return matchPath(path, pathname, exact) !== null
}

/**
 * Hook to get a navigate function with molecule Router options inside any React
 * Router router. MoleculeRouterProvider is optional; mount it only for named
 * routes, the non-React navigate()/getRouter() bond, or onRouterReady.
 *
 * @returns Navigate function
 *
 * @example
 * ```tsx
 * function Form() {
 *   const navigate = useMoleculeNavigate()
 *
 *   const handleSubmit = async () => {
 *     await saveData()
 *     navigate('/success', { state: { fromForm: true } })
 *   }
 * }
 * ```
 */
export function useMoleculeNavigate(): Router['navigate'] {
  const router = useMoleculeRouter()
  return router.navigate.bind(router)
}

/**
 * Hook to get current query params as an object inside any React Router router.
 * MoleculeRouterProvider is optional; mount it only for named routes, the
 * non-React navigate()/getRouter() bond, or onRouterReady.
 *
 * @returns Query params object
 *
 * @example
 * ```tsx
 * function SearchResults() {
 *   const query = useMoleculeQuery()
 *   const searchTerm = query.q
 * }
 * ```
 */
export function useMoleculeQuery(): QueryParams {
  useRequiredRouterContext()
  const { search } = useLocation()
  return useMemo(() => parseQuery(search), [search])
}

/** Top-level `history.state` keys React Router owns; every other key is the app's. */
const REACT_ROUTER_STATE_KEYS = ['usr', 'key', 'idx', 'masked']

/**
 * The router a consumed parameter navigates through: its replace keeps the top-level
 * `history.state` fields React Router does not model.
 */
const retainingHistoryState = (router: Router): Router => ({
  ...router,
  navigate: (path, options) => {
    const before: unknown = typeof window === 'undefined' ? undefined : window.history.state
    const result = router.navigate(path, options)
    if (before !== null && typeof before === 'object') {
      const retained = Object.fromEntries(
        Object.entries(before).filter(([key]) => !REACT_ROUTER_STATE_KEYS.includes(key)),
      )
      if (Object.keys(retained).length > 0) {
        window.history.replaceState(
          { ...retained, ...window.history.state },
          '',
          window.location.href,
        )
      }
    }
    return result
  },
})

/** One consumed parameter with the router and name it belongs to, and its setter. */
const holdConsumedSearchParam = (
  router: Router,
  name: string,
): {
  router: Router
  name: string
  param: ConsumedSearchParam
  update: Dispatch<SetStateAction<string>>
} => {
  const param = createConsumedSearchParam(retainingHistoryState(router), name)
  return {
    router,
    name,
    param,
    update: (action) => param.set(typeof action === 'function' ? action(param.get()) : action),
  }
}

/**
 * Consume a credential query parameter into component state and remove only that parameter from
 * the address through React Router. The value survives local rerenders, StrictMode, failed-submit
 * retries and later query-only navigation; a newly arriving value on the same mounted route is
 * consumed too and shows one commit later. Path, hash, unrelated query values and router location state are retained.
 *
 * React Router owns the URL replacement, so `useLocation()` and `window.location` agree. A
 * metadata-only history merge retains unrelated pre-existing top-level state fields that React
 * Router does not model; it never changes the URL or the router's `usr`/`key`/`idx` fields.
 *
 * @param name - The credential query key to consume, for example `token` or `code`.
 * @returns The consumed value and its state setter; the value is empty before first consumption.
 * @example
 * ```tsx
 * const [resetToken] = useConsumedSearchParam('token')
 * // The form submits resetToken after the address no longer contains it.
 * ```
 */
export function useConsumedSearchParam(
  name: string,
): readonly [string, Dispatch<SetStateAction<string>>] {
  const router = useMoleculeRouter()
  // Held in state, not a memo: the value lives only here once the address is clean.
  const [held, setHeld] = useState(() => holdConsumedSearchParam(router, name))
  if (held.router !== router || held.name !== name) setHeld(holdConsumedSearchParam(router, name))
  const { param } = held
  const value = useSyncExternalStore(param.subscribe, param.get, param.get)
  useEffect(() => param.connect(), [param])
  return [value, held.update] as const
}
