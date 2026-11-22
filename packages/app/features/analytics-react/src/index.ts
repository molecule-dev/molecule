/**
 * React bindings for `@molecule/app-analytics`.
 *
 * Provides ready-made React components that consume the wired analytics
 * bond. Currently exports `AnalyticsRouteListener`, a render-free
 * component that fires a `page` event on every client-side route change.
 *
 * Mount `AnalyticsRouteListener` once inside the app's router subtree —
 * it listens for `useLocation()` changes and forwards each
 * pathname / search change to the wired analytics bond's `page()`. The
 * routing bond mounts `RouterProvider`, so the listener renders beneath it
 * and under every routing bond.
 *
 * @example
 * ```tsx
 * import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
 *
 * // Mount once beside the app's routed view, inside the routing bond's shell.
 * export function App() {
 *   return <AnalyticsRouteListener />
 * }
 * ```
 *
 * @module
 */

export * from './AnalyticsRouteListener.js'
