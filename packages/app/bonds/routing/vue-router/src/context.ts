/**
 * The Vue provide/inject key a mounted `MoleculeRouterProvider` supplies to its
 * descendants.
 *
 * @module
 */

import type { ComputedRef, InjectionKey } from 'vue'

import type { Router } from './types.js'

/**
 * Injection key for the molecule `Router` a `MoleculeRouterProvider` provides to every
 * component below it. `useMoleculeRouter` reads it first, so mounting the provider once
 * makes each descendant composable return that exact router — with its named routes and
 * its bond — instead of a router owned by the calling component.
 *
 * A provided value is normally the provider's `ComputedRef<Router>`; a plain `Router` is
 * accepted too, for an app that provides its adapter by hand.
 */
export const MOLECULE_ROUTER_KEY: InjectionKey<ComputedRef<Router> | Router | undefined> =
  Symbol('molecule-router')
