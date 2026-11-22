/**
 * The routed view's injection token. Kept out of the package's exports, as in
 * `@molecule/app-react`: a routed view is provided only with a router
 * (`provideRouter(router, { routedView })`).
 *
 * @module
 */

import { inject, InjectionToken, type Type } from '@angular/core'

import { I18nError } from '@molecule/app-i18n'

/** The component the routing bond renders where the matched child route goes. */
export const ROUTED_VIEW = new InjectionToken<Type<unknown>>('molecule-routed-view')

/**
 * The routed view the routing bond provided, for `RoutedView`. Call it in an injection context.
 *
 * @returns The routing bond's routed view.
 * @throws {I18nError} When the routing bond has none.
 */
export function routedViewOrThrow(): Type<unknown> {
  const view = inject(ROUTED_VIEW, { optional: true })
  if (!view) {
    throw new I18nError(
      'angular.error.noRoutedView',
      undefined,
      'This routing bond has no routed view to render here: pass the page as children instead.',
    )
  }
  return view
}
