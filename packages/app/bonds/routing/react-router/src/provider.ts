/**
 * React Router (v7/v8) provider implementation.
 *
 * `createReactRouter` is `@molecule/app-routing`'s `createHistoryRouter` over the config
 * snapshot: navigation, guards, query/hash helpers, named routes and matching all come
 * from the shared core, so this bond behaves like every other routing bond.
 *
 * @module
 */

import { createHistoryRouter } from '@molecule/app-routing'

import { createReactRouterSnapshotHistory } from './history.js'
import type { ReactRouterConfig, Router } from './types.js'

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
  createHistoryRouter(createReactRouterSnapshotHistory(config), { routes: config.routes })

/**
 * Default React Router provider (basic, no hooks). For full functionality, use
 * `createReactRouter` with `useNavigate`/`useLocation`/`useParams`.
 */
export const provider = createReactRouter()
