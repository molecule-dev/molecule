/**
 * Solid bindings for `@molecule/app-analytics`.
 *
 * Provides ready-made Solid components that consume the wired analytics
 * bond. Currently exports `AnalyticsRouteListener`, a render-free
 * component that fires a `page` event on every client-side route change.
 *
 * Mount `AnalyticsRouteListener` once inside a `MoleculeProvider`
 * configured with a router — it tracks `useLocation()` and forwards each
 * pathname / search change to the wired analytics bond's `page()`.
 *
 * @example
 * ```tsx
 * import { render } from 'solid-js/web'
 * import { createMemoryRouter } from '@molecule/app-routing'
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { AnalyticsRouteListener } from '@molecule/app-analytics-solid'
 * import { Home } from './Home.js'
 *
 * const router = createMemoryRouter({ initialEntries: ['/'] })
 *
 * render(
 *   () => (
 *     <MoleculeProvider router={router}>
 *       <AnalyticsRouteListener />
 *       <Home />
 *     </MoleculeProvider>
 *   ),
 *   document.getElementById('root')!,
 * )
 * ```
 *
 * @module
 */

export * from './AnalyticsRouteListener.jsx'
