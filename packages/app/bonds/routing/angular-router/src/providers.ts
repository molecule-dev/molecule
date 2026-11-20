/**
 * Angular providers for the molecule router.
 *
 * @module
 */

import { Location } from '@angular/common'
import {
  DestroyRef,
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core'
import { Router as AngularRouter } from '@angular/router'

import { ROUTER } from '@molecule/app-angular'
import { get } from '@molecule/app-bond'
import type {
  Router,
  SignInRequiredHttpSource,
  SignInRequiredSessionSource,
  SignInRequiredSources,
} from '@molecule/app-routing'
import { DEFAULT_SIGN_IN_PATH, redirectSignedOutRejections } from '@molecule/app-routing'

import { bondMoleculeRouter, MOLECULE_ROUTER_CONTEXT, moleculeRouterFor } from './router-context.js'
import type { AngularRouterOptions } from './types.js'

/**
 * The molecule routers whose sign-in rule is applied, so a second provider scope over the
 * same Angular Router does not redirect a second time.
 */
const signInWatched = new WeakSet<Router>()

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
 * With HTTP and auth clients bonded, the router replaces the current location with
 * `/login` after a credential-free GET receives a 401 and the session is confirmed signed
 * out, as React's `BrowserRouter` does (`redirectSignedOutRejections` from
 * `@molecule/app-routing`), until the application is destroyed. `location.state.from`
 * holds the original location. Set `signInPath` to use a different sign-in route or
 * `signInPath: false` to opt out.
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
      const router = inject(MOLECULE_ROUTER_CONTEXT)
      bondMoleculeRouter(router, options.onRouterReady)
      const { signInPath = DEFAULT_SIGN_IN_PATH } = options
      if (signInPath === false || signInWatched.has(router)) return
      signInWatched.add(router)
      const stop = redirectSignedOutRejections(router, {
        signInPath,
        sources: bondedSignInSources,
      })
      inject(DestroyRef).onDestroy(() => {
        stop()
        signInWatched.delete(router)
      })
    }),
  ])
