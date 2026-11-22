/**
 * The memory router a case's component sees.
 *
 * @module
 */

import { createMemoryRouter, type RouteDefinition, type Router } from '@molecule/app-routing'

import type { CaseContext } from './spec.js'

/**
 * Creates the memory router for a case: at the case's `route`, refusing every navigation to one
 * of its `refusedRoutes` (a navigation guard answers `false`), so a case can show what a
 * component renders while its redirect cannot land.
 *
 * @param context - The case's route and refused routes.
 * @param routes - Route definitions the router matches (a binding case's `routes`).
 * @returns The router.
 */
export function createCaseRouter(
  context: Pick<CaseContext, 'route' | 'refusedRoutes'> = {},
  routes?: RouteDefinition[],
): Router {
  const router = createMemoryRouter({ initialEntries: [context.route ?? '/'], routes })
  const refused = context.refusedRoutes ?? []
  if (refused.length > 0) router.addGuard((to) => !refused.includes(to.pathname))
  return router
}
