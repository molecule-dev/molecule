/**
 * React hooks for React Router integration.
 *
 * @module
 */

import React, { createContext, type ReactNode,useContext, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { t } from '@molecule/app-i18n'

import { createReactRouter } from './provider.js'
import type { QueryParams,RouteDefinition, Router } from './types.js'

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
 * Provider component that creates a molecule Router from React Router hooks.
 *
 * @param root0 - The component props.
 * @param root0.children - Child components to render within the router context.
 * @param root0.routes - Optional route definitions for named routes.
 * @param root0.onRouterReady - Callback invoked when the router instance is ready.
 * @returns The rendered provider wrapping children with the router context.
 * @example
 * ```tsx
 * import { BrowserRouter, Routes, Route } from 'react-router-dom'
 * import { MoleculeRouterProvider } from '@molecule/app-routing-react-router'
 *
 * function App() {
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
export function MoleculeRouterProvider({
  children,
  routes = [],
  onRouterReady,
}: MoleculeRouterProviderProps): React.JSX.Element {
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
    throw new Error(t('routing.error.useMoleculeRouterOutsideProvider', undefined, { defaultValue: 'useMoleculeRouter must be used within a MoleculeRouterProvider' }))
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
