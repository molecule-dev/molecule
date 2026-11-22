/**
 * Cases for `RoutedView`, the component a layout or guard renders where the matched child route
 * goes, through whichever routing bond the app wired. That it throws when the routing bond has no
 * routed view is proved in each binding's own tests, under `@molecule/app-react`'s titles.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/** `<RoutedView />`: the routing bond's routed view. */
export const RoutedViewCases: HookCases = {
  hook: 'RoutedView',
  render: 'text',
  cases: [
    {
      name: "renders the routing bond's routed view",
      args: [{}],
      context: { routedView: 'Routed page' },
    },
    {
      name: 'renders the routed view at a nested route',
      args: [{}],
      context: { route: '/items/7', routes: [{ path: '/items/:id' }], routedView: 'Item 7' },
    },
  ],
}
