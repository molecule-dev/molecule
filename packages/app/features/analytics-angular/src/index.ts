/**
 * Angular bindings for `@molecule/app-analytics`.
 *
 * Provides ready-made Angular components that consume the wired analytics
 * bond. Currently exports `AnalyticsRouteListener`, a render-free
 * component that fires a `page` event on every client-side route change.
 *
 * Mount `AnalyticsRouteListener` once inside the router registration's
 * scope (`provideRouter`) — it follows `useLocation()` and forwards each
 * pathname / search change to the wired analytics bond's `page()`.
 *
 * @example
 * ```ts
 * import { bootstrapApplication } from '@angular/platform-browser'
 * import { createMemoryRouter } from '@molecule/app-routing'
 * import { provideRouter } from '@molecule/app-angular'
 * import { AnalyticsRouteListener } from '@molecule/app-analytics-angular'
 * import { Home } from './home.js'
 *
 * bootstrapApplication(Home, {
 *   providers: [provideRouter(createMemoryRouter({ initialEntries: ['/'] }))],
 * }).catch((error) => console.error(error))
 * ```
 *
 * @remarks
 * - The analytics provider comes from the wired `app-analytics` bond
 *   (`setProvider`); unbonded, the `page` calls are no-ops.
 * - React's root is nothing, so the component contributes no DOM at all: its
 *   host stays out of the page.
 *
 * @module
 */

export * from './analytics-route-listener.component.js'
