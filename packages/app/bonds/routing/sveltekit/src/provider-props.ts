/**
 * The props `MoleculeRouterProvider` takes, the SvelteKit counterpart of React's
 * `MoleculeRouterProviderProps`.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { RouteDefinition, Router } from '@molecule/app-routing'

import type { SvelteKitNavigation } from './types.js'

/**
 * Props for {@link MoleculeRouterProvider}: React's `routes`, `onRouterReady` and
 * `children`, plus the SvelteKit navigation the app builds in its root layout.
 */
export interface MoleculeRouterProviderProps {
  /**
   * The app's SvelteKit pieces, built once in the root layout with
   * `createSvelteKitNavigation`: kit's `goto`, `page`, `navigating` and its root href.
   */
  navigation: SvelteKitNavigation

  /**
   * Route definitions for molecule named routes, exactly as the core
   * `createHistoryRouter` takes them. Pass a stable array: the router is created with the
   * first one, and a later, different array registers onto the same router.
   */
  routes?: RouteDefinition[]

  /**
   * Path to replace the current location with on a signed-out GET 401. Defaults to
   * `/login`; `false` turns the redirect off.
   */
  signInPath?: string | false

  /**
   * Called ONCE with the router, during the provider's initialisation and after the bond
   * exists, so `@molecule/app-routing`'s `getRouter()` already returns it. Changing the
   * callback later does not call it again, as React's provider does not: the router is
   * built once for the provider's whole mounted life.
   *
   * @param router - The router the provider built and bonded.
   */
  onRouterReady?: (router: Router) => void

  /**
   * The page below the provider. Every component rendered here reads the router through
   * the bond's hooks.
   */
  children: Snippet
}
