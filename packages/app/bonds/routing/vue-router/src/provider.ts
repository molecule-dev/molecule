/**
 * Vue Router provider implementation.
 *
 * The whole molecule `Router` (query/hash helpers, guards, named routes, matching,
 * subscriptions) comes from `@molecule/app-routing`'s `createHistoryRouter`; this provider
 * supplies the Vue Router's history ({@link vueRouterHistory}) and route definitions.
 *
 * With HTTP and auth clients bonded, the router built over a Vue Router replaces the current
 * location with `/login` after a credential-free GET receives a 401 and the session is
 * confirmed signed out, as React's `BrowserRouter` does (`redirectSignedOutRejections` from
 * `@molecule/app-routing`). `location.state.from` holds the original location. Set
 * `signInPath` to use a different sign-in route or `signInPath: false` to opt out.
 *
 * @module
 */

import type { Router as VueRouterInstance } from 'vue-router'

import { get } from '@molecule/app-bond'
import type {
  Router,
  SignInRequiredHttpSource,
  SignInRequiredSessionSource,
  SignInRequiredSources,
} from '@molecule/app-routing'
import {
  createBrowserRouter,
  createHistoryRouter,
  DEFAULT_SIGN_IN_PATH,
  redirectSignedOutRejections,
} from '@molecule/app-routing'

import { vueRouterHistory } from './history.js'
import type { VueRouterConfig } from './types.js'

/**
 * The Vue Routers whose sign-in rule is applied, so a second molecule router over the same
 * Vue Router (`useMoleculeRouter` beside the app's own `createVueRouter`) does not redirect
 * a second time.
 */
const signInWatched = new WeakSet<VueRouterInstance>()

/**
 * The HTTP and auth clients the app bonds, read from the same slots as their accessors
 * without loading the optional packages.
 *
 * @returns Both sources, or `undefined` while either is unbonded.
 */
const bondedSignInSources = (): SignInRequiredSources | undefined => {
  const http = get<SignInRequiredHttpSource>('http-client')
  const session = get<SignInRequiredSessionSource>('auth-client')
  return http && session ? { http, session } : undefined
}

/**
 * Creates a molecule `Router` that drives a Vue Router instance.
 *
 * Guards, named routes and query/hash management are the ones every routing bond shares
 * (`createHistoryRouter`); the location always reads Vue Router's live `currentRoute`, so
 * it never goes stale after a navigation, and subscribers hear Vue Router's own
 * navigations (links, the back button) too — not only `navigate` calls made here.
 *
 * Without a `router` (no Vue Router instance yet), the core's browser router is returned,
 * without the sign-in rule.
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
  const { router, routes = [], signInPath = DEFAULT_SIGN_IN_PATH } = config
  if (!router) return createBrowserRouter({ routes })
  const moleculeRouter = createHistoryRouter(vueRouterHistory(router), { routes })
  if (signInPath === false || signInWatched.has(router)) return moleculeRouter
  signInWatched.add(router)
  const stop = redirectSignedOutRejections(moleculeRouter, {
    signInPath,
    sources: bondedSignInSources,
  })
  const destroy = moleculeRouter.destroy
  moleculeRouter.destroy = (): void => {
    stop()
    signInWatched.delete(router)
    destroy()
  }
  return moleculeRouter
}

/**
 * Default Vue Router provider (no Vue Router instance: the core's browser router). For the
 * real Vue Router, use `createVueRouter` with `useRouter` — or the `useMoleculeRouter*`
 * composables, which bond it for you.
 */
export const provider = createVueRouter()
