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
 * @example
 * ```tsx
 * import { setProvider } from '@molecule/app-analytics'
 * import { createProvider } from '@molecule/app-analytics-posthog'
 * import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
 * import { BrowserRouter, Link, Route, Routes } from 'react-router'
 *
 * // Startup, once: bond an analytics provider. In a Vite app pass
 * // `import.meta.env.VITE_POSTHOG_KEY`; without a bond every page() is a silent no-op.
 * const posthogKey = 'phc_example_project_key'
 * setProvider(createProvider({ apiKey: posthogKey }))
 *
 * export function App() {
 *   return (
 *     <BrowserRouter>
 *       <AnalyticsRouteListener />
 *       <nav>
 *         <Link to="/pricing">Pricing</Link>
 *       </nav>
 *       <Routes>
 *         <Route path="/" element={<h1>Home</h1>} />
 *         <Route path="/pricing" element={<h1>Pricing</h1>} />
 *       </Routes>
 *     </BrowserRouter>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Must be inside a router** (`BrowserRouter`, or a data router's layout route) from
 *   `react-router` — it calls `useLocation()`, which throws outside one. Mount it ONCE; a second
 *   instance double-counts every page view.
 * - **It does nothing without an analytics bond.** Wire `setProvider(...)` from
 *   `@molecule/app-analytics` (e.g. `@molecule/app-analytics-posthog`'s `createProvider`) at
 *   startup; unbonded, `page()` silently no-ops, and provider errors are swallowed too.
 * - Each event is `page({ name: pathname, path: pathname + search, url: window.location.href })`
 *   — hash-only changes are NOT tracked, and it sends no title/category. Do not also enable a
 *   provider's own automatic pageview capture, or views are counted twice.
 * - It only tracks page views; call `track()` / `identify()` from `@molecule/app-analytics` for
 *   events and users.
 *
 * @module
 */

export * from './AnalyticsRouteListener.js'
