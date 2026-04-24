/**
 * React bindings for `@molecule/app-analytics`.
 *
 * Provides ready-made React components that consume the wired analytics
 * bond. Currently exports `AnalyticsRouteListener`, a render-free
 * component that fires a `page` event on every client-side route change.
 *
 * Mount `AnalyticsRouteListener` once inside a `BrowserRouter`
 * subtree — it listens for `useLocation()` changes and forwards each
 * pathname / search change to the wired analytics bond's `page()`.
 *
 * @module
 */

export * from './AnalyticsRouteListener.js'
