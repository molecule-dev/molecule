/**
 * Angular providers for the molecule router.
 *
 * @module
 */

import { Location } from '@angular/common'
import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core'
import { Router as AngularRouter } from '@angular/router'

import { ROUTER } from '@molecule/app-angular'

import { bondMoleculeRouter, MOLECULE_ROUTER_CONTEXT, moleculeRouterFor } from './router-context.js'
import type { AngularRouterOptions } from './types.js'

/**
 * Provides the molecule `Router` built on Angular's own `Router` and `Location`,
 * under `@molecule/app-angular`'s `ROUTER` token, so molecule packages and app code
 * (`inject(ROUTER)`, `@molecule/app-angular`'s services) navigate through Angular.
 *
 * Apps add it next to Angular's own `provideRouter(routes)` — Angular keeps owning
 * its route config; the molecule options only name the routes molecule should know
 * ({@link Router.navigateTo}, {@link Router.generatePath}).
 *
 * The application's environment initializer bonds the adapter through
 * `@molecule/app-routing`'s `setRouter` when the app bootstraps (React's
 * `MoleculeRouterProvider` bonds in its mount effect), so `navigate()`/`getRouter()`
 * from `@molecule/app-routing` drive the real Angular Router instead of the core's
 * browser-history fallback. {@link AngularRouterOptions.onRouterReady} runs at that
 * same moment, once per router.
 *
 * @param options - Molecule route definitions for named routes and route params, and the
 *   optional ready callback.
 * @returns Environment providers.
 *
 * @example
 * ```ts
 * import { bootstrapApplication } from '@angular/platform-browser'
 * import { provideRouter } from '@angular/router'
 * import { provideMoleculeRouter } from '@molecule/app-routing-angular-router'
 *
 * bootstrapApplication(App, {
 *   providers: [provideRouter(routes), provideMoleculeRouter()],
 * })
 * ```
 */
export const provideMoleculeRouter = (options: AngularRouterOptions = {}): EnvironmentProviders =>
  makeEnvironmentProviders([
    {
      provide: MOLECULE_ROUTER_CONTEXT,
      useFactory: () => moleculeRouterFor(inject(AngularRouter), inject(Location), options),
    },
    {
      provide: ROUTER,
      useFactory: () => inject(MOLECULE_ROUTER_CONTEXT),
    },
    // Runs at bootstrap, in an injection context, before any component renders: the
    // caller's navigate()/getRouter() reach the real Angular Router from the first page,
    // as React's provider bonds in its mount effect.
    provideEnvironmentInitializer(() => {
      bondMoleculeRouter(inject(MOLECULE_ROUTER_CONTEXT), options.onRouterReady)
    }),
  ])
