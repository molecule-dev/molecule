import { defineComponent, type VNodeChild } from 'vue'
import { type RouteParamValueRaw, type RouteRecordRaw, useRoute } from 'vue-router'

import type { VueRouteParams } from './types.js'

/**
 * Flattens one Vue Router parameter value into a string.
 *
 * @param value - A string, a repeated parameter's array, or nothing.
 * @returns The string, the array joined with `/`, or `undefined` when empty.
 */
function paramToString(value: RouteParamValueRaw | readonly string[]): string | undefined {
  const text = Array.isArray(value) ? value.join('/') : value
  return text === undefined || text === null || text === '' ? undefined : String(text)
}

/**
 * Register a literal Vue Router path and give its page the params that path declares.
 *
 * Create the route at module scope and add it to the `routes` passed to
 * `createRouter`. The render callback returns the page's vnodes and runs again
 * when the params change. A repeated parameter (`:name+`, `:name*`) arrives as one
 * string joined with `/`, and an omitted optional parameter is `undefined`.
 *
 * @param path - A route path, including any named parameters.
 * @param render - Builds the page from the parameters named in that path.
 * @returns The path and component for Vue Router's route table.
 */
export function defineRoute<const Path extends string>(
  path: Path,
  render: (params: NoInfer<VueRouteParams<Path>>) => VNodeChild,
): RouteRecordRaw & { path: Path } {
  const Page = defineComponent({
    /**
     * Read the matched route from Vue Router.
     *
     * @returns A render function that calls `render` with the current params.
     */
    setup() {
      const route = useRoute()
      return () => {
        const params: Record<string, string | undefined> = {}
        for (const [name, value] of Object.entries(route.params)) {
          params[name] = paramToString(value)
        }
        // Vue Router supplies string or undefined for every key. The path narrows
        // the callback's keys while the values stay the router's decoded ones.
        return render(params as VueRouteParams<Path>)
      }
    },
  })

  return { path, component: Page }
}
