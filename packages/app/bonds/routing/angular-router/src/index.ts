/**
 * Angular Router provider for `@molecule/app-routing`.
 *
 * Implements the framework-neutral molecule `Router` over the Angular Router, so
 * molecule packages and app code can navigate, read params/query and register guards
 * without importing `@angular/router` — while Angular keeps owning its own routes,
 * links and guards. Guards, named routes, query/hash helpers and subscriptions come
 * from `@molecule/app-routing`'s `createHistoryRouter`, so this bond behaves exactly
 * like the other routing bonds and an app can swap routing bonds without noticing.
 *
 * Wire it once at bootstrap, next to Angular's own router providers, and inject it
 * through `@molecule/app-angular`'s `ROUTER` token:
 *
 * @example
 * ```ts
 * import { bootstrapApplication } from '@angular/platform-browser'
 * import { provideRouter } from '@angular/router'
 * import { provideMoleculeRouter } from '@molecule/app-routing-angular-router'
 *
 * bootstrapApplication(App, {
 *   providers: [
 *     provideRouter([
 *       { path: '', component: HomeComponent },
 *       { path: 'users/:id', component: UserComponent },
 *     ]),
 *     provideMoleculeRouter({ routes: [{ path: '/users/:id', name: 'user' }] }),
 *   ],
 * })
 * ```
 *
 * Outside Angular's injector (no `inject(AngularRouter)` available), build the
 * adapter directly with {@link createAngularRouter}; the exported {@link provider}
 * constant is the core browser router fallback (an Angular-backed router needs a
 * booted injector, which an import-time constant cannot have).
 *
 * A route with parameters? Declare its page with `defineRoute` and read its parameters with
 * `injectRouteParams`. The route path is the source of truth for the parameter names (`:name`;
 * Angular paths have no optional parameters):
 *
 * @example
 * ```ts
 * import { defineRoute, injectRouteParams } from '@molecule/app-routing-angular-router'
 *
 * class ShelfPage {
 *   readonly params = injectRouteParams<'shelves/:shelf'>()
 * }
 *
 * const routes = [defineRoute('shelves/:shelf', ShelfPage)]
 * ```
 *
 * @module @molecule/app-routing-angular-router
 */

export * from './define-route.js'
export * from './provider.js'
export * from './providers.js'
export * from './types.js'
