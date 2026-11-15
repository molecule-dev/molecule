/**
 * Vue analytics route listener.
 *
 * Vue counterpart of `@molecule/app-analytics-react`'s `AnalyticsRouteListener`
 * — the same behavior for the same input: a `page` event with the current
 * pathname / search on mount and on every client-side route change. It takes
 * no props and renders nothing.
 *
 * @module
 */

import { defineComponent, watch } from 'vue'

import { page } from '@molecule/app-analytics'
import { useLocation } from '@molecule/app-vue'

/**
 * Records a `page_view` on client-side route changes.
 *
 * Mount once inside the router plugin's scope (`createRouterPlugin`). On
 * every pathname / search change, dispatches a `page` event through the wired
 * analytics bond. Renders nothing.
 *
 * @returns The render-free listener component.
 */
export const AnalyticsRouteListener = defineComponent({
  name: 'AnalyticsRouteListener',
  setup() {
    const location = useLocation()

    watch(
      [() => location.value.pathname, () => location.value.search],
      ([pathname, search]) => {
        void page({
          name: pathname,
          path: pathname + search,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        })
      },
      { immediate: true },
    )

    return () => null
  },
})
