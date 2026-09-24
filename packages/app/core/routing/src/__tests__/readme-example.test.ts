// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, against a real DOM History API
 * (happy-dom) — nothing in the router is mocked.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import type { RouteLocation } from '../index.js'
import { createBrowserRouter, getParams, getQuery, navigate, setRouter } from '../index.js'

describe('README @example', () => {
  it('pushes the generated URL and exposes params + query to subscribers', async () => {
    window.history.replaceState(null, '', '/')

    const router = createBrowserRouter({
      routes: [
        { path: '/', name: 'home', exact: true },
        { path: '/projects/:id', name: 'project' },
      ],
    })
    setRouter(router)

    const seen: Array<[string, string, string | undefined, string | string[] | undefined]> = []
    const stop = router.subscribe((location: RouteLocation, action) => {
      const { id } = getParams<{ id: string }>()
      const { sort } = getQuery()
      seen.push([action, location.pathname, id, sort])
    })

    const url = router.generatePath('project', { id: '42' }, { sort: 'recent' })
    expect(url).toBe('/projects/42?sort=recent')
    navigate(url)

    // Asynchronous: the old route is still current on the next line.
    expect(getParams()).toEqual({})

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toEqual([['push', '/projects/42', '42', 'recent']])
    expect(window.location.pathname).toBe('/projects/42')
    expect(window.location.search).toBe('?sort=recent')

    stop()
    navigate('/')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toHaveLength(1)
    router.destroy()
  })
})
