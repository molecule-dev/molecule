/**
 * The Svelte context a mounted `MoleculeRouterProvider` supplies to its subtree.
 *
 * The context key is private to this module: an app reads the router through the bond's
 * hooks ({@link useMoleculeRouter} and the ones built on it), never through the key, so
 * there is exactly one way to reach it and the key cannot collide with another package's.
 *
 * This module is internal: `src/index.ts` does not re-export it.
 *
 * @module
 */

import { getContext, setContext } from 'svelte'

import type { Router } from '@molecule/app-routing'

import type { SvelteKitNavigation } from './types.js'

/** The key the provider stores its router under, private to this module. */
const MOLECULE_ROUTER_KEY = Symbol('molecule-sveltekit-router')

/** What a provider supplies: its router and the navigation it built the router over. */
export interface ProvidedMoleculeRouter {
  /** The router the provider built and bonded. */
  router: Router
  /** The navigation the router reads kit through. */
  navigation: SvelteKitNavigation
}

/**
 * Hands `router` to every component below the calling one.
 *
 * Svelte accepts `setContext` only during a component's initialisation, which is exactly
 * when the provider builds its router.
 *
 * @param provided - The router the provider built and the navigation it reads kit through.
 */
export const provideMoleculeRouter = (provided: ProvidedMoleculeRouter): void => {
  setContext(MOLECULE_ROUTER_KEY, provided)
}

/**
 * What the nearest `MoleculeRouterProvider` supplied.
 *
 * Must be called during a component's initialisation, where Svelte reads context.
 *
 * @returns The provider's router and navigation, or `undefined` when no provider is above
 * the caller.
 */
export const readMoleculeProvider = (): ProvidedMoleculeRouter | undefined =>
  getContext<ProvidedMoleculeRouter | undefined>(MOLECULE_ROUTER_KEY)

/**
 * The router the nearest `MoleculeRouterProvider` supplied.
 *
 * Must be called during a component's initialisation, where Svelte reads context.
 *
 * @returns The provider's router, or `undefined` when no provider is above the caller.
 */
export const readMoleculeRouter = (): Router | undefined => readMoleculeProvider()?.router
