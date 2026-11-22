/**
 * `RoutedView`, as `@molecule/app-react`'s: the matched child route, through whichever routing
 * bond the app wired.
 *
 * @module
 */

import { createComponent, type JSX, useContext } from 'solid-js'

import { I18nError } from '@molecule/app-i18n'

import { RoutedViewContext } from './routed-view-context.js'

/**
 * Renders the matched child route, through whichever routing bond the app wired. A layout or
 * guard renders it where its page goes when it was given no children, so the component imports
 * no router library.
 *
 * @returns The routing bond's routed view.
 * @throws {I18nError} When the routing bond has no routed view (Solid Router gives a route's
 * component its nested route as `props.children`): use the component as a route's `component`,
 * or pass the page as children. Rendering nothing there would show a blank page with no error.
 * @example
 * ```tsx
 * <main>{props.children ?? <RoutedView />}</main>
 * ```
 */
export function RoutedView(): JSX.Element {
  const View = useContext(RoutedViewContext)
  if (!View) {
    throw new I18nError(
      'solid.error.noRoutedView',
      undefined,
      "No routed view here. Solid Router gives a route's component its nested route as `props.children`: use this as a route's `component`, or pass the page as children.",
    )
  }
  return createComponent(View, {})
}
