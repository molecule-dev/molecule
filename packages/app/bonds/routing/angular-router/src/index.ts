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
 * Wire it once at bootstrap, next to Angular's own router providers. It provides the router
 * to `@molecule/app-angular` (its `ROUTER` token, its hooks, and `<mol-routed-view />`,
 * which renders Angular Router's outlet: in a routed layout, the matched child route):
 *
 * With HTTP and auth clients bonded, the router `provideMoleculeRouter` provides
 * replaces the current URL with `/login` after a credential-free GET receives a 401 and
 * the session is confirmed signed out, as React's `BrowserRouter` does. `location.state.from`
 * holds the original location. Set `signInPath` to use a different sign-in route or pass
 * `signInPath: false` to opt out.
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
 * `useMoleculeRouter`, `useMoleculeQuery`, `useMoleculeNavigate` and `useIsActive` are
 * React's routing hooks under React's names: they work inside any Angular application
 * whose injector has Angular's `Router` (`provideRouter(routes)`, or `provideRouter` plus
 * `provideLocationMocks()` for a memory history), with or without
 * {@link provideMoleculeRouter} — React's hooks never need their provider either. Call
 * them in an injection context; the two whose answer follows the URL return signals.
 * {@link lazyPage} is React's `lazyPage` under React's name: a route page loaded on
 * demand, replaced at once when the URL moves and showing its own `fallback` until its
 * code arrives — where `loadComponent` makes the router hold the previous page. Angular
 * page props are the wrapper's `props` input.
 * {@link ListRouteNav} is React's `ListRouteNav` as `<nav mol-list-route-nav>`: every
 * declared list view is one of its own anchors, and the URL selects the active choice.
 * Mount {@link provideMoleculeRouter} to bond the adapter for `@molecule/app-routing`'s
 * `navigate()`/`getRouter()`, to name routes, or to receive `onRouterReady`. A router a
 * hook created without a provider stays local, so several of them cannot overwrite the
 * global bond.
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
export * from './hooks.js'
export * from './lazy-page.js'
export * from './list-route-nav.js'
export * from './list-types.js'
export * from './provider.js'
export * from './providers.js'
export * from './types.js'
export * from './use-consumed-search-param.js'
export * from './use-list-route.js'
export * from './utilities.js'
