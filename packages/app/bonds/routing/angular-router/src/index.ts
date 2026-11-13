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
 * @module @molecule/app-routing-angular-router
 */

export * from './provider.js'
export * from './providers.js'
export * from './types.js'
