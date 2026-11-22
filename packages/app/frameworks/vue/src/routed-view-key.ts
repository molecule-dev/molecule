/**
 * The routed view's injection key. Kept out of the package's exports, as in
 * `@molecule/app-react`: a routed view is provided only with a router (`RouterProvider`'s
 * `routedView`, or `createRouterPlugin(router, { routedView })`).
 *
 * @module
 */

import type { Component, InjectionKey } from 'vue'

/**
 * The component the routing bond renders where the matched child route goes (Vue Router's
 * `RouterView`); `null` when the bond has none.
 */
export const RoutedViewKey: InjectionKey<Component | null> = Symbol('molecule-routed-view')
