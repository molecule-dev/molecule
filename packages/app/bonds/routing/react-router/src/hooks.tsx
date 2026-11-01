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
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'

import { t } from '@molecule/app-i18n'
import { setRouter } from '@molecule/app-routing'

import { createReactRouter } from './provider.js'
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
 * Provider component that creates a molecule Router from React Router hooks and
 * bonds it as the active singleton via `@molecule/app-routing`'s `setRouter`.
 *
 * Bonding happens in an effect on mount (and again whenever the location/params
 * change), so `@molecule/app-routing`'s `navigate()`/`getRouter()` drive THIS real
 * React Router adapter — no manual `setRouter` wiring required. Mount it once inside
 * `<BrowserRouter>`.
 *
 * @param props - The provider props (see {@link MoleculeRouterProviderProps}):
 *   `children` (rendered inside the router context), `routes` (optional named-route
 *   definitions), and `onRouterReady` (optional callback invoked with the router
 *   after it is bonded, e.g. to register guards — bonding via `setRouter` happens
 *   regardless).
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
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  useSearchParams() // Subscribe to search param changes

  const router = useMemo(
    () =>
      createReactRouter({
        navigate,
        location: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          state: location.state,
          key: location.key,
        },
        params,
        routes,
      }),
    [navigate, location, params, routes],
  )

  useEffect(() => {
    // Bond THIS adapter so @molecule/app-routing's navigate()/getRouter() drive the
    // real React Router instead of the core's auto-created fallback browser router.
    setRouter(router)
    onRouterReady?.(router)
  }, [router, onRouterReady])

  return <MoleculeRouterContext.Provider value={router}>{children}</MoleculeRouterContext.Provider>
}

/**
 * Hook to get the molecule Router.
 *
 * @returns The molecule Router instance
 * @throws {Error} If used outside MoleculeRouterProvider.
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
  if (!router) {
    throw new Error(
      t('routing.error.useMoleculeRouterOutsideProvider', undefined, {
        defaultValue: 'useMoleculeRouter must be used within a MoleculeRouterProvider',
      }),
    )
  }
  return router
}

/**
 * Hook to check if a path is currently active.
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
 * Hook to get a navigate function with molecule Router options.
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
 * Hook to get current query params as an object.
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
