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

/** The key the provider stores its router under, private to this module. */
const MOLECULE_ROUTER_KEY = Symbol('molecule-sveltekit-router')

/**
 * Hands `router` to every component below the calling one.
 *
 * Svelte accepts `setContext` only during a component's initialisation, which is exactly
 * when {@link createSvelteKitRouter} builds the provider's router.
 *
 * @param router - The router the provider built over the app's navigation.
 */
export const provideMoleculeRouter = (router: Router): void => {
  setContext(MOLECULE_ROUTER_KEY, router)
}

/**
 * The router the nearest `MoleculeRouterProvider` supplied.
 *
 * Must be called during a component's initialisation, where Svelte reads context.
 *
 * @returns The provider's router, or `undefined` when no provider is above the caller.
 */
export const readMoleculeRouter = (): Router | undefined =>
  getContext<Router | undefined>(MOLECULE_ROUTER_KEY)
