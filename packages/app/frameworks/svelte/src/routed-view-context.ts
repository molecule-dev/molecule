/**
 * The routed view's Svelte context. Kept out of the package's exports, as in
 * `@molecule/app-react`: a routed view is provided only with a router (`RouterProvider`'s
 * `routedView`, or `setRouterContext(router, { routedView })`).
 *
 * @module
 */

import type { Component } from 'svelte'
import { getContext, setContext } from 'svelte'

import { I18nError } from '@molecule/app-i18n'

const ROUTED_VIEW_KEY = Symbol('molecule-routed-view')

/**
 * Sets the component the routing bond renders where the matched child route goes. Call it
 * during component initialization.
 *
 * @param view - The routed view, or `null` when the routing bond has none.
 */
export function setRoutedViewContext(view: Component | null): void {
  setContext(ROUTED_VIEW_KEY, view)
}

/**
 * The routed view from Svelte context, for `RoutedView`. Call it during component
 * initialization.
 *
 * @returns The routing bond's routed view.
 * @throws {I18nError} When the routing bond has none (SvelteKit gives a layout its page as
 * `children`).
 */
export function routedViewOrThrow(): Component {
  const view = getContext<Component | null | undefined>(ROUTED_VIEW_KEY)
  if (!view) {
    throw new I18nError(
      'svelte.error.noRoutedView',
      undefined,
      'No routed view here. SvelteKit gives a layout its page as `children`: pass `{@render children()}` inside this component.',
    )
  }
  return view
}
