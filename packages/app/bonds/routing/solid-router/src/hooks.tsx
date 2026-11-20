/**
 * Solid hooks for the bond's molecule Router, under React's hook names.
 *
 * Each hook works inside any Solid Router (`<Router>`, `<HashRouter>` or `<MemoryRouter>`)
 * with no `MoleculeRouterProvider` mounted, as React's hooks do without their provider: a
 * router-reading hook that is called without a provider builds ONE molecule router for the
 * calling component's life and destroys it on cleanup. Mount
 * {@link MoleculeRouterProvider} for a shared router with named routes, the non-Solid
 * `@molecule/app-routing` `navigate()`/`getRouter()` bond, or `onRouterReady`.
 *
 * Solid runs a component's body once, so a value that follows the location is returned as
 * an accessor ({@link useMoleculeQuery}, {@link useIsActive}); React returns the value and
 * re-renders instead.
 *
 * @module
 */

import { RouterContext, useLocation } from '@solidjs/router'
import { type Accessor, createMemo, onCleanup, useContext } from 'solid-js'

import { I18nError } from '@molecule/app-i18n'
import type { QueryParams, Router } from '@molecule/app-routing'
import { matchPath, parseQuery } from '@molecule/app-routing'

import { MoleculeRouterContext } from './context.js'
import { createSolidRouter } from './provider.js'
import type { SolidRouterOptions } from './types.js'

/**
 * Throws, naming the routers to mount, when the caller is not inside a Solid Router router.
 * Solid Router's own error ("can be only used inside a Route") names none.
 *
 * @throws {I18nError} `routing.solidRouter.error.useMoleculeRouterOutsideRouter`.
 */
const requireSolidRouter = (): void => {
  if (useContext(RouterContext)) return
  throw new I18nError(
    'routing.solidRouter.error.useMoleculeRouterOutsideRouter',
    undefined,
    '`useMoleculeRouter` must be used within a Solid Router router. Mount `Router`, `HashRouter` or `MemoryRouter`.',
  )
}

/**
 * Gets the molecule `Router` inside any Solid Router. No `MoleculeRouterProvider` is
 * required.
 *
 * When `MoleculeRouterProvider` is mounted, returns its exact router with its named
 * routes. Otherwise creates ONE router for the calling component's whole life — its
 * location, params and queries follow the native router through every navigation, and
 * `subscribe()` hears the native router's own links and the back button — without bonding
 * it globally; the router is destroyed when the component is cleaned up. Mount
 * `MoleculeRouterProvider` for the non-Solid `@molecule/app-routing` `navigate()`/
 * `getRouter()` bond or `onRouterReady`.
 *
 * @param options - Route definitions for a component-owned router's named routes, and the
 *   memory history a `<MemoryRouter history={…}>` above uses (see
 *   {@link createSolidRouter}); ignored when a provider supplies the router.
 * @returns The molecule `Router` instance.
 * @throws {I18nError} `routing.solidRouter.error.useMoleculeRouterOutsideRouter` outside a
 * Solid Router router.
 * @example
 * ```tsx
 * function NavigationButton() {
 *   const router = useMoleculeRouter()
 *
 *   return <button onClick={() => router.navigate('/dashboard')}>Go to Dashboard</button>
 * }
 * ```
 */
export function useMoleculeRouter(options: SolidRouterOptions = {}): Router {
  const provided = useContext(MoleculeRouterContext)
  if (provided) return provided
  requireSolidRouter()
  // A component's own router: the app-level router applies the sign-in rule once.
  const router = createSolidRouter({ ...options, signInPath: false })
  onCleanup(() => router.destroy())
  return router
}

/**
 * Gets a navigate function with molecule Router options inside any Solid Router. Mount
 * `MoleculeRouterProvider` only for named routes, the non-Solid `navigate()`/`getRouter()`
 * bond, or `onRouterReady`.
 *
 * @returns The router's navigate function.
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
 * Gets the current query params as an object inside any Solid Router. Mount
 * `MoleculeRouterProvider` only for named routes, the non-Solid `navigate()`/`getRouter()`
 * bond, or `onRouterReady`.
 *
 * @returns An accessor for the query params, re-read as the location's search changes.
 * @example
 * ```tsx
 * function SearchResults() {
 *   const query = useMoleculeQuery()
 *   const searchTerm = () => query().q
 * }
 * ```
 */
export function useMoleculeQuery(): Accessor<QueryParams> {
  requireSolidRouter()
  const location = useLocation()
  return createMemo(() => parseQuery(location.search))
}

/**
 * Checks whether a path is currently active inside any Solid Router. Mount
 * `MoleculeRouterProvider` only for named routes, the non-Solid `navigate()`/`getRouter()`
 * bond, or `onRouterReady`.
 *
 * @param path - Path to check.
 * @param exact - Whether to require an exact match.
 * @returns An accessor for whether the path is active, re-read as the location changes.
 * @example
 * ```tsx
 * function NavLink(props: { to: string; children: JSX.Element }) {
 *   const isActive = useIsActive(props.to)
 *   return (
 *     <a href={props.to} classList={{ active: isActive() }}>
 *       {props.children}
 *     </a>
 *   )
 * }
 * ```
 */
export function useIsActive(path: string, exact?: boolean): Accessor<boolean> {
  requireSolidRouter()
  const location = useLocation()
  return createMemo(() => matchPath(path, location.pathname, exact) !== null)
}
