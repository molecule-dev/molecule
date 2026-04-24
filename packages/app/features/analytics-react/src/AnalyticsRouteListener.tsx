import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { page } from '@molecule/app-analytics'

/**
 * Records a `page_view` on client-side route changes.
 *
 * Mount once inside a `BrowserRouter` subtree. On every pathname /
 * search change, dispatches a `page` event through the wired analytics
 * bond. Renders nothing.
 *
 * @returns Always `null` — this component renders nothing.
 */
export function AnalyticsRouteListener(): null {
  const { pathname, search } = useLocation()

  useEffect(() => {
    void page({
      name: pathname,
      path: pathname + search,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    })
  }, [pathname, search])

  return null
}
