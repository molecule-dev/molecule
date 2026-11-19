/**
 * The bond's own router context and its per-native-router instances.
 *
 * `provideMoleculeRouter` provides {@link MOLECULE_ROUTER_CONTEXT}; the hooks read it
 * optionally and fall back to {@link moleculeRouterFor}, which builds (once) and caches
 * a molecule `Router` for each Angular Router instance. That is this bond's counterpart
 * of React's `MoleculeRouterContext` plus its per-component fallback router, and of Vue's
 * `moleculeRouters` `WeakMap`.
 *
 * @module
 */

import type { Location } from '@angular/common'
import { InjectionToken } from '@angular/core'
import type { Router as AngularRouter } from '@angular/router'

import { type Router, setRouter } from '@molecule/app-routing'

import { createAngularRouter } from './provider.js'
import type { AngularRouterOptions } from './types.js'

/**
 * The molecule `Router` a mounted `provideMoleculeRouter` bonded, for the hooks to read.
 *
 * It is this bond's own token (not `@molecule/app-angular`'s `ROUTER`), so a hook inside
 * a component of an app that wired some other router through `provideMolecule` still gets
 * the Angular Router adapter of this bond — exactly as React's hooks read the provider's
 * context rather than a globally bonded router.
 */
export const MOLECULE_ROUTER_CONTEXT = new InjectionToken<Router>('molecule-angular-router')

/**
 * One molecule `Router` per Angular Router instance. The adapter reads Angular's live
 * `router.url` and `Location` on every call and follows `router.events`, so it never needs
 * rebuilding: every hook and every provider shares the same instance for that router's
 * lifetime, and mounting several fallback consumers cannot replace the global bond.
 */
const moleculeRouters = new WeakMap<AngularRouter, Router>()

/**
 * The routers already announced through `onRouterReady`, so a second bond of the same
 * router (a route-level `provideMoleculeRouter`, say) does not call the callback again —
 * React's provider ref, one entry per router instead of one per component instance.
 */
const announced = new WeakSet<Router>()

/**
 * Returns the molecule `Router` for an Angular Router, creating it on first use.
 *
 * The molecule route definitions of the FIRST creation are the ones the router keeps;
 * a later call (another provider scope, another hook call) returns the existing router
 * unchanged, and registers its routes through `router.registerRoutes` instead of
 * replacing the router.
 *
 * @param router - Angular's `Router`, injected from the booted injector.
 * @param location - Angular's `Location` over the same history.
 * @param options - Molecule route definitions for named routes and route params.
 * @returns The molecule `Router` driving that Angular Router.
 */
export const moleculeRouterFor = (
  router: AngularRouter,
  location: Location,
  options: AngularRouterOptions = {},
): Router => {
  const existing = moleculeRouters.get(router)
  if (existing) {
    if (options.routes && options.routes.length > 0) existing.registerRoutes(options.routes)
    return existing
  }
  const created = createAngularRouter(router, location, options)
  moleculeRouters.set(router, created)
  return created
}

/**
 * Bonds a molecule `Router` as `@molecule/app-routing`'s active router, once per router.
 *
 * `setRouter` runs on every bond (it is idempotent for the same router), and
 * `onRouterReady` runs only the first time a given router is announced — a later
 * provider scope sharing that router, with a new callback, is not a new router, exactly
 * as React's `MoleculeRouterProvider` keeps its `readyRouter` ref.
 *
 * @param router - The molecule `Router` to bond.
 * @param onRouterReady - Optional callback invoked once with the bonded router.
 */
export const bondMoleculeRouter = (
  router: Router,
  onRouterReady?: (router: Router) => void,
): void => {
  setRouter(router)
  if (announced.has(router)) return
  announced.add(router)
  onRouterReady?.(router)
}
