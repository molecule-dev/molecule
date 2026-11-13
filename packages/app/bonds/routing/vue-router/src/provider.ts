/**
 * Vue Router provider implementation.
 *
 * The whole molecule `Router` (query/hash helpers, guards, named routes, matching,
 * subscriptions) comes from `@molecule/app-routing`'s `createHistoryRouter`; this provider
 * supplies the Vue Router's history ({@link vueRouterHistory}) and route definitions.
 *
 * @module
 */

import type { Router } from '@molecule/app-routing'
import { createBrowserRouter, createHistoryRouter } from '@molecule/app-routing'

import { vueRouterHistory } from './history.js'
import type { VueRouterConfig } from './types.js'

/**
 * Creates a molecule `Router` that drives a Vue Router instance.
 *
 * Guards, named routes and query/hash management are the ones every routing bond shares
 * (`createHistoryRouter`); the location always reads Vue Router's live `currentRoute`, so
 * it never goes stale after a navigation, and subscribers hear Vue Router's own
 * navigations (links, the back button) too — not only `navigate` calls made here.
 *
 * Without a `router` (no Vue Router instance yet), the core's browser router is returned.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useRouter } from 'vue-router'
 * import { createVueRouter } from '@molecule/app-routing-vue-router'
 * import { setRouter } from '@molecule/app-routing'
 *
 * const moleculeRouter = createVueRouter({ router: useRouter() })
 * setRouter(moleculeRouter)
 * </script>
 * ```
 * @param config - The Vue Router instance, optional route definitions for molecule named
 * routes, and (accepted but unused, see `VueRouterConfig.route`) a current `route` snapshot.
 * @returns A molecule `Router` with navigation, guards, query/hash management, and route
 * matching.
 */
export const createVueRouter = (config: VueRouterConfig = {}): Router => {
  const { router, routes = [] } = config
  if (!router) return createBrowserRouter({ routes })
  return createHistoryRouter(vueRouterHistory(router), { routes })
}

/**
 * Default Vue Router provider (no Vue Router instance: the core's browser router). For the
 * real Vue Router, use `createVueRouter` with `useRouter` — or the `useMoleculeRouter*`
 * composables, which bond it for you.
 */
export const provider = createVueRouter()
