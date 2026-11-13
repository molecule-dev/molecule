/**
 * React hooks for React Router integration.
 *
 * @module
 */

import React, {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { createHistoryRouter, type NavigationAction, setRouter } from '@molecule/app-routing'

import {
  createReactRouterHistory,
  type ReactRouterHistory,
  type ReactRouterSnapshot,
} from './history.js'
import type { QueryParams, RouteDefinition, Router } from './types.js'

/**
 * Context for the molecule Router.
 */
const MoleculeRouterContext = createContext<Router | null>(null)

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
 * molecule router. The effect runs when the committed location reaches the component;
 * it is keyed on the location key, so a key React Router already reported (a StrictMode
 * replay) is not reported twice, and the first run — the mount — reports nothing.
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

  useEffect(() => {
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
  const [router] = useState(() => createHistoryRouter(history, { routes }))

  return { router, history, locationKey: location.key, navigationType }
}

/**
 * Provider component that creates ONE molecule Router over React Router for its whole
 * mounted life and bonds it as the active singleton via `@molecule/app-routing`'s
 * `setRouter`. Subscribers and guards registered on the router survive navigation:
 * `@molecule/app-routing`'s `getRouter()` keeps returning it, `onRouterReady` fires once,
 * and React Router's own links and the back button reach `router.subscribe()`.
 *
 * Bonding happens in an effect on mount, so `@molecule/app-routing`'s
 * `navigate()`/`getRouter()` drive THIS real React Router adapter — no manual `setRouter`
 * wiring required. Mount it once inside any React Router router when non-React code needs
 * the bond, named routes are configured, or `onRouterReady` is needed. The routing hooks
 * work without this provider.
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
  const { children, routes = [], onRouterReady } = props
  const { router, history, locationKey, navigationType } = useMoleculeRouterInstance(routes)

  const readyCallback = useRef(onRouterReady)
  readyCallback.current = onRouterReady

  useEffect(() => {
    // Bonded once per router: `@molecule/app-routing`'s navigate()/getRouter() drive THIS
    // real React Router adapter for the provider's whole life, and `onRouterReady` fires
    // once instead of on every navigation.
    setRouter(router)
    readyCallback.current?.(router)
  }, [router])

  const registeredRoutes = useRef(routes)
  useEffect(() => {
    // The routes the router was created with are already registered; a later array
    // registers onto THIS router instead of replacing it.
    if (registeredRoutes.current === routes) return
    registeredRoutes.current = routes
    router.registerRoutes(routes)
  }, [routes, router])

  useNotifyCommittedNavigation(history, locationKey, navigationType)

  return <MoleculeRouterContext.Provider value={router}>{children}</MoleculeRouterContext.Provider>
}

/**
 * Hook to get the molecule Router inside any React Router router, including
 * BrowserRouter, HashRouter, MemoryRouter, Router, or RouterProvider from this
 * package or React Router itself. No MoleculeRouterProvider is required.
 *
 * When MoleculeRouterProvider is mounted, returns its exact router with its named
 * routes. Otherwise creates ONE router for the calling component's whole life — its
 * location, params and queries follow React Router through every navigation, and
 * `subscribe()` hears React Router's own links and the back button — without bonding
 * it globally. Mount MoleculeRouterProvider for the non-React `@molecule/app-routing`
 * navigate()/getRouter() bond or onRouterReady.
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
  const router = useContext(MoleculeRouterContext)
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

  const {
    router: localRouter,
    history,
    locationKey,
    navigationType,
  } = useMoleculeRouterInstance([])
  // The provider's router notifies through the provider; a locally created one is idle.
  useNotifyCommittedNavigation(router ? null : history, locationKey, navigationType)
  return router ?? localRouter
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
  const router = useMoleculeRouter()
  const location = useLocation()
  // Re-evaluate when location changes
  return useMemo(() => router.isActive(path, exact), [router, path, exact, location.pathname])
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
  const router = useMoleculeRouter()
  const location = useLocation()
  // Re-evaluate when search changes
  return useMemo(() => router.getQuery(), [router, location.search])
}

/**
 * Consume a credential query parameter into component state and remove only that parameter from
 * the address through React Router. The value survives local rerenders, StrictMode, failed-submit
 * retries and later query-only navigation; a newly arriving value on the same mounted route is
 * consumed too. Path, hash, unrelated query values and router location state are retained.
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
  const location = useLocation()
  const navigate = useNavigate()
  const current = new URLSearchParams(location.search).get(name) ?? ''
  const [consumed, setConsumed] = useState(current)
  const consumedByEntry = useRef(new Map<string, string>())
  const pending = useRef<string | undefined>(undefined)
  const latest = useRef(consumed)
  latest.current = consumed

  const updateConsumed = useCallback<Dispatch<SetStateAction<string>>>(
    (action) => {
      setConsumed((previous) => {
        const next = typeof action === 'function' ? action(previous) : action
        consumedByEntry.current.set(location.key, next)
        return next
      })
    },
    [location.key],
  )

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.has(name)) {
      const pendingValue = pending.current
      if (pendingValue !== undefined) {
        consumedByEntry.current.set(location.key, pendingValue)
        pending.current = undefined
      } else if (consumedByEntry.current.has(location.key)) {
        setConsumed(consumedByEntry.current.get(location.key) ?? '')
      } else if (latest.current) {
        // Query-only navigation creates a new key but not a new credential link.
        consumedByEntry.current.set(location.key, latest.current)
      }
      return
    }

    const value = params.get(name) ?? ''
    pending.current = value
    setConsumed(value)
    params.delete(name)
    const search = params.toString()
    const previousHistoryState =
      typeof window === 'undefined' ? undefined : (window.history.state as unknown)

    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      },
      { replace: true, state: location.state },
    )

    if (
      previousHistoryState !== null &&
      typeof previousHistoryState === 'object' &&
      typeof window !== 'undefined'
    ) {
      const retained = Object.fromEntries(
        Object.entries(previousHistoryState).filter(
          ([key]) => !['usr', 'key', 'idx', 'masked'].includes(key),
        ),
      )
      if (Object.keys(retained).length > 0) {
        window.history.replaceState(
          { ...retained, ...window.history.state },
          '',
          window.location.href,
        )
      }
    }
  }, [location, navigate, name])

  return [
    current || (consumedByEntry.current.get(location.key) ?? consumed),
    updateConsumed,
  ] as const
}
