/**
 * Router bond accessor and convenience navigation functions.
 *
 * If no custom router is bonded, a browser-based or memory-based router
 * is auto-created on first access depending on the environment.
 *
 * @module
 */

import { bond, get as bondGet } from '@molecule/app-bond'

import { createBrowserRouter, createMemoryRouter } from './router.js'
import type { NavigateOptions, QueryParams, RouteLocation, RouteParams, Router } from './types.js'

const BOND_TYPE = 'router'

/**
 * Registers a router as the active singleton. Called by bond packages
 * (e.g. `@molecule/app-routing-react`) during application startup.
 *
 * @param router - The router implementation to bond.
 */
export const setRouter = (router: Router): void => {
  bond(BOND_TYPE, router)
}

/**
 * Retrieves the bonded router. If none is bonded, automatically creates
 * a browser-based router (in browser environments) or a memory-based
 * router (in SSR/test environments).
 *
 * @returns The active router instance.
 */
export const getRouter = (): Router => {
  const existing = bondGet<Router>(BOND_TYPE)
  if (existing) return existing
  const fallback = typeof window !== 'undefined' ? createBrowserRouter() : createMemoryRouter()
  bond(BOND_TYPE, fallback)
  return fallback
}

/**
 * Navigates to a path using the bonded router.
 *
 * @param path - The target path to navigate to.
 * @param options - Navigation options such as `replace` and `state`.
 * @returns Nothing.
 */
export const navigate = (path: string, options?: NavigateOptions): void =>
  getRouter().navigate(path, options)

/**
 * Returns the current route location from the bonded router.
 *
 * @returns The current location (pathname, search, hash, state).
 */
export const getLocation = (): RouteLocation => getRouter().getLocation()

/**
 * Returns the current route parameters from the bonded router.
 *
 * @returns The current route parameters as a typed record.
 */
export const getParams = <T extends RouteParams = RouteParams>(): T => getRouter().getParams<T>()

/**
 * Returns the current query parameters from the bonded router.
 *
 * @returns The current query parameters as a record.
 */
export const getQuery = (): QueryParams => getRouter().getQuery()
