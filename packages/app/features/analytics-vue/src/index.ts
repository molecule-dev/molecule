/**
 * Vue bindings for `@molecule/app-analytics`.
 *
 * Provides ready-made Vue components that consume the wired analytics
 * bond. Currently exports `AnalyticsRouteListener`, a render-free
 * component that fires a `page` event on every client-side route change.
 *
 * Mount `AnalyticsRouteListener` once inside the router plugin's scope —
 * it watches `useLocation()` and forwards each pathname / search change
 * to the wired analytics bond's `page()`.
 *
 * @example
 * ```ts
 * import { createApp, h } from 'vue'
 * import { createMemoryRouter } from '@molecule/app-routing'
 * import { createRouterPlugin } from '@molecule/app-vue'
 * import { AnalyticsRouteListener } from '@molecule/app-analytics-vue'
 * import { Home } from './Home.js'
 *
 * const app = createApp({
 *   render: () => [h(AnalyticsRouteListener), h(Home)],
 * })
 *
 * app.use(createRouterPlugin(createMemoryRouter({ initialEntries: ['/'] })))
 * app.mount('#app')
 * ```
 *
 * @module
 */

export * from './AnalyticsRouteListener.js'
