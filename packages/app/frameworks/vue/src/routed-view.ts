/**
 * `RoutedView`, as `@molecule/app-react`'s: the matched child route, through whichever routing
 * bond the app wired.
 *
 * @module
 */

import { defineComponent, h, inject, type VNode } from 'vue'

import { I18nError } from '@molecule/app-i18n'

import { RoutedViewKey } from './routed-view-key.js'

/**
 * Renders the matched child route, through whichever routing bond the app wired (Vue Router's
 * `RouterView` under the vue-router bond). A layout or guard used as a route component renders
 * it where its page goes, so the component imports no router library.
 *
 * Throws an `I18nError` (`vue.error.noRoutedView`) when the routing bond has no routed view:
 * pass the page in the default slot instead. Rendering nothing there would show a blank page
 * with no error.
 *
 * @example
 * ```vue
 * <template>
 *   <main><slot><RoutedView /></slot></main>
 * </template>
 * ```
 */
export const RoutedView = defineComponent({
  name: 'RoutedView',
  setup() {
    const view = inject(RoutedViewKey, null)
    if (!view) {
      throw new I18nError(
        'vue.error.noRoutedView',
        undefined,
        'This routing bond has no routed view to render here: pass the page as children instead. If the app routes with `@molecule/app-routing-vue-router`, that bond is older than this binding: update it (`npm install @molecule/app-routing-vue-router@latest`).',
      )
    }
    return (): VNode => h(view)
  },
})
