/**
 * The server renderers: `StaticRouter` and `StaticRouterProvider` give a server-rendered page
 * the molecule router, so `@molecule/app-react`'s routing hooks, `Link` and `RoutedView` render
 * there; React Router's own `StaticRouter` gives them none.
 */
import type { JSX } from 'react'
import { renderToString } from 'react-dom/server'
import {
  createStaticHandler,
  createStaticRouter,
  Route,
  Routes,
  StaticRouter as ReactRouterStaticRouter,
} from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { RoutedView, useLocation } from '@molecule/app-react'
import { Link } from '@molecule/app-react/link'

import { StaticRouter, StaticRouterProvider } from '../index.js'

/**
 * Prints the location the molecule router reads.
 *
 * @returns The location as text.
 */
function Where(): JSX.Element {
  const { pathname, search } = useLocation()
  return <span data-where="">{`${pathname}${search}`}</span>
}

/**
 * A layout route: the location, a link and the matched child route.
 *
 * @returns The layout.
 */
function Layout(): JSX.Element {
  return (
    <main>
      <Where />
      <Link to="/users">Users</Link>
      <RoutedView />
    </main>
  )
}

const page = (
  <Routes>
    <Route path="/users" element={<Layout />}>
      <Route path=":id" element={<p>User page</p>} />
    </Route>
  </Routes>
)

describe('server renderers', () => {
  it('StaticRouter renders the molecule router for its location', () => {
    const html = renderToString(
      <StaticRouter basename="/app" location="/app/users/5?tab=1">
        {page}
      </StaticRouter>,
    )

    expect(html).toContain('<span data-where="">/users/5?tab=1</span>')
    expect(html).toContain('href="/app/users"')
    expect(html).toContain('<p>User page</p>')
  })

  it("React Router's own StaticRouter leaves the molecule hooks without a router", () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() =>
        renderToString(
          <ReactRouterStaticRouter location="/users/5">{page}</ReactRouterStaticRouter>,
        ),
      ).toThrow()
    } finally {
      error.mockRestore()
    }
  })

  it('StaticRouterProvider renders the molecule router for a static data router', async () => {
    const handler = createStaticHandler([
      {
        path: '/users',
        element: <Layout />,
        children: [{ path: ':id', element: <p>User page</p> }],
      },
    ])
    const context = await handler.query(new Request('http://localhost/users/5?tab=1'))
    if (context instanceof Response) throw new Error(`unexpected response ${context.status}`)

    const html = renderToString(
      <StaticRouterProvider
        router={createStaticRouter(handler.dataRoutes, context)}
        context={context}
        hydrate={false}
      />,
    )

    expect(html).toContain('<span data-where="">/users/5?tab=1</span>')
    expect(html).toContain('href="/users"')
    expect(html).toContain('<p>User page</p>')
  })
})
