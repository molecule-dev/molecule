/**
 * Solid analytics route listener.
 *
 * Solid counterpart of `@molecule/app-analytics-react`'s `AnalyticsRouteListener`
 * — the same behavior for the same input: a `page` event with the current
 * pathname / search on mount and on every client-side route change. It takes
 * no props and renders nothing.
 *
 * @module
 */

import { type Component, createEffect, createMemo } from 'solid-js'

import { page } from '@molecule/app-analytics'
import { useLocation } from '@molecule/app-solid'

/**
 * Records a `page_view` on client-side route changes.
 *
 * Mount once inside a `MoleculeProvider` configured with a router. On every
 * pathname / search change, dispatches a `page` event through the wired
 * analytics bond. Renders nothing.
 *
 * @returns The render-free listener component.
 */
export const AnalyticsRouteListener: Component = () => {
  const location = useLocation()

  // React keys its effect on the pathname and search VALUES. The memos keep
  // that behavior: a navigation that replaces the location object without
  // changing either value does not re-record.
  const pathname = createMemo(() => location().pathname)
  const search = createMemo(() => location().search)

  createEffect(() => {
    const name = pathname()
    void page({
      name,
      path: name + search(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    })
  })

  return null
}
