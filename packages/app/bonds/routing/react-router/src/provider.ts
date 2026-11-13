/**
 * React Router (v7/v8) provider implementation.
 *
 * `createReactRouter` is `@molecule/app-routing`'s `createHistoryRouter` over the config
 * snapshot: navigation, guards, query/hash helpers, named routes and matching all come
 * from the shared core, so this bond behaves like every other routing bond.
 *
 * @module
 */

import { I18nError, t } from '@molecule/app-i18n'
import { createHistoryRouter } from '@molecule/app-routing'

import { createReactRouterSnapshotHistory } from './history.js'
import type { ReactRouterConfig, Router } from './types.js'

/**
 * The message the core's named routes throw with for a missing name, as this exact
 * `t()` call renders it. Comparing against the same call the core makes keeps the
 * detection exact in every locale.
 *
 * @param name - The route name that was looked up.
 * @returns The interpolated route-not-found message.
 */
const routeNotFoundMessage = (name: string): string =>
  t('routing.error.routeNotFound', { name }, { defaultValue: 'Route "{{name}}" not found' })

/**
 * Rethrows the core's route-not-found `Error` as the bond's `I18nError`, so the key and
 * values travel with the error for re-translation. The core owns the named-route logic;
 * only the error type is this bond's contract.
 *
 * @param router - The router `createHistoryRouter` built.
 * @returns The same router with the named-route methods rethrowing `I18nError`.
 */
const withI18nRouteErrors = (router: Router): Router => {
  const generatePath = router.generatePath.bind(router)
  const navigateTo = router.navigateTo.bind(router)

  const rethrowNamedRouteError = <T>(name: string, action: () => T): T => {
    try {
      return action()
    } catch (error) {
      if (error instanceof Error && error.message === routeNotFoundMessage(name)) {
        throw new I18nError(
          'routing.error.routeNotFound',
          { name },
          'Route "{{name}}" not found',
          error,
        )
      }
      throw error
    }
  }

  router.generatePath = (name, routeParams, query) =>
    rethrowNamedRouteError(name, () => generatePath(name, routeParams, query))

  router.navigateTo = (name, routeParams, query, options) =>
    rethrowNamedRouteError(name, () => navigateTo(name, routeParams, query, options))

  return router
}

/**
 * Creates a React Router adapter that implements the molecule Router interface over a
 * config snapshot: the `navigate` function, `location` and `params` of one render. The
 * snapshot never changes, so every read answers for that render — the hooks
 * (`MoleculeRouterProvider`, `useMoleculeRouter`) build the live router instead, one
 * that follows React Router for its whole life. Navigation runs React Router's
 * `navigate`, falling back to a full-page `window.location` navigation when no
 * `navigate` was given (the hook-less `provider`).
 *
 * @example
 * ```tsx
 * import { useNavigate, useLocation, useParams } from 'react-router'
 * import { createReactRouter, setRouter } from '@molecule/app-routing-react-router'
 * import { useEffect, useMemo } from 'react'
 *
 * function RouterProvider({ children }) {
 *   const navigate = useNavigate()
 *   const location = useLocation()
 *   const params = useParams()
 *
 *   const router = useMemo(() => createReactRouter({
 *     navigate,
 *     location,
 *     params,
 *   }), [navigate, location, params])
 *
 *   useEffect(() => {
 *     setRouter(router)
 *   }, [router])
 *
 *   return children
 * }
 * ```
 * @param config - Configuration with React Router's `navigate` function, `location`, `params`, and optional `routes`.
 * @returns A molecule `Router` with navigation, guards, query/hash management, and route matching.
 */
export const createReactRouter = (config: ReactRouterConfig = {}): Router =>
  withI18nRouteErrors(
    createHistoryRouter(createReactRouterSnapshotHistory(config), { routes: config.routes }),
  )

/**
 * Default React Router provider (basic, no hooks). For full functionality, use
 * `createReactRouter` with `useNavigate`/`useLocation`/`useParams`.
 */
export const provider = createReactRouter()
