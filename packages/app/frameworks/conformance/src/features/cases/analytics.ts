/**
 * `@molecule/app-analytics-react` cases: the render-free route listener that
 * records a `page_view` on every client-side route change.
 *
 * `AnalyticsRouteListener` takes no props and renders nothing, so every case
 * is about the route it mounts at and the navigations it survives: the
 * snapshots show the empty DOM and the route each navigation landed on.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-analytics-react`. */
export const analyticsFeature: FeatureCases = {
  package: '@molecule/app-analytics-react',
  families: [
    {
      component: 'AnalyticsRouteListener',
      cases: [
        { name: 'mounted inside a route', context: { route: '/dashboard' } },
        {
          name: 'a route change',
          context: { route: '/a' },
          interactions: [{ type: 'navigate', to: '/b' }],
        },
        {
          name: 'a search change on the same path',
          context: { route: '/items' },
          interactions: [{ type: 'navigate', to: '/items?page=2' }],
        },
        {
          name: 'a route change with a query',
          context: { route: '/home' },
          interactions: [{ type: 'navigate', to: '/settings?tab=2' }],
        },
        {
          name: 'several route changes',
          context: { route: '/one' },
          interactions: [
            { type: 'navigate', to: '/two?x=1' },
            { type: 'navigate', to: '/three' },
            { type: 'navigate', to: '/one' },
          ],
        },
        {
          name: 'unmounted after a route change',
          context: { route: '/before' },
          interactions: [{ type: 'navigate', to: '/after' }, { type: 'unmount' }],
        },
      ],
    },
  ],
}
