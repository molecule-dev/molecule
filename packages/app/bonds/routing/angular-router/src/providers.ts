/**
 * Angular providers for the molecule router.
 *
 * @module
 */

import { Location } from '@angular/common'
import type { EnvironmentProviders } from '@angular/core'
import { inject, makeEnvironmentProviders } from '@angular/core'
import { Router as AngularRouter } from '@angular/router'

import { ROUTER } from '@molecule/app-angular'

import { createAngularRouter } from './provider.js'
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
 * @param options - Molecule route definitions for named routes and route params.
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
      provide: ROUTER,
      useFactory: () => createAngularRouter(inject(AngularRouter), inject(Location), options),
    },
  ])
