/**
 * The routed view's context. Kept out of the package's exports, as in `@molecule/app-react`: a
 * routed view is provided only through `RouterProvider`'s `routedView`, so it can never be
 * provided without a router.
 *
 * @module
 */

import { type Component, createContext } from 'solid-js'

/**
 * The component the routing bond renders where the matched child route goes; `null` when the
 * bond has none (Solid Router gives a route's component its nested route as `props.children`).
 */
export const RoutedViewContext = createContext<Component | null>(null)
