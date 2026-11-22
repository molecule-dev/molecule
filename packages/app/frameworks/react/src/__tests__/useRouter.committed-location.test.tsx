// @vitest-environment jsdom

/**
 * A component that stays mounted across a navigation renders the new location in the first
 * commit after it, never the previous one for a commit. A React routing bond (the react-router
 * one) answers `getLocation()` with the new location as soon as its own tree re-renders and
 * notifies subscribers from an effect after that commit; a hook that copied the location into
 * state on notification rendered the old one in between. That is a whole-tree `AuthGuard`
 * mounting the protected page for one commit before it redirects, and a nav item painting one
 * frame with the old active state.
 *
 * Each case records what each COMMIT saw, so a stale commit fails even though the settled DOM
 * is the same either way.
 *
 * @module
 */

import { act, render } from '@testing-library/react'
import type { ComponentType, JSX } from 'react'
import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import type { RouteLocation, Router } from '@molecule/app-routing'
import { createMemoryRouter } from '@molecule/app-routing'

import {
  useLocation,
  useNavigate,
  useParams,
  useQuery,
  useRouterInstance,
} from '../hooks/useRouter.js'
import { RoutedView, RouterProvider } from '../providers.js'

/**
 * Records the value of every commit, in order.
 *
 * @param props - The value to record and the array to record it in.
 * @returns Nothing rendered.
 */
function CommittedValue<T>({ value, into }: { value: T; into: T[] }): null {
  useEffect(() => {
    into.push(value)
  })
  return null
}

/**
 * A router shaped like the react-router bond's: its location is whatever the shell rendered
 * last, and it tells subscribers after the commit.
 *
 * @returns The router, the shell that drives it and a way to navigate.
 */
function bondShapedRouter(): {
  router: Router
  Shell: (props: { page: ComponentType }) => JSX.Element
  navigate: { current: (path: string) => void }
} {
  const rendered = { path: '/items/1?tab=a' }
  const listeners = new Set<() => void>()
  const locationOf = (path: string): RouteLocation => {
    const [pathname, query = ''] = path.split('?')
    return { pathname, search: query ? `?${query}` : '', hash: '' }
  }
  const base = createMemoryRouter()
  const router: Router = {
    ...base,
    getLocation: () => locationOf(rendered.path),
    getParams: () => ({ id: locationOf(rendered.path).pathname.split('/')[2] ?? '' }),
    getQuery: () => Object.fromEntries(new URLSearchParams(locationOf(rendered.path).search)),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  const navigate = { current: (_path: string): void => undefined }
  /**
   * The bond's provider: its own state is the location, refreshed into the router every render,
   * with subscribers told after the commit. It renders the page in that same render, as React
   * Router re-renders the matched route's element on a navigation.
   *
   * @param props - The page under it.
   * @param props.page - The page.
   * @returns The provider.
   */
  function Shell({ page }: { page: ComponentType }): JSX.Element {
    const Page = page
    const [path, setPath] = useState(rendered.path)
    navigate.current = setPath
    rendered.path = path
    useEffect(() => {
      for (const listener of listeners) listener()
    }, [path])
    return (
      <RouterProvider router={router}>
        <Page />
      </RouterProvider>
    )
  }
  return { router, Shell, navigate }
}

describe('the routing hooks across a navigation', () => {
  it('render the new location, params and query in the first commit after it', () => {
    const { Shell, navigate } = bondShapedRouter()
    const commits: string[] = []
    /**
     * A page that stays mounted across the navigation.
     *
     * @returns What it read, recorded per commit.
     */
    function Page(): JSX.Element {
      const location = useLocation()
      const params = useParams<{ id: string }>()
      const query = useQuery<{ tab?: string }>()
      return (
        <CommittedValue
          value={`${location.pathname}${location.search} id=${params.id} tab=${query.tab}`}
          into={commits}
        />
      )
    }
    render(<Shell page={Page} />)
    commits.length = 0
    act(() => navigate.current('/items/2?tab=b'))
    expect(commits.length).toBeGreaterThan(0)
    expect(commits).toEqual(commits.map(() => '/items/2?tab=b id=2 tab=b'))
  })

  it('counterexample: a location that does not change renders no new value', () => {
    const { Shell } = bondShapedRouter()
    const commits: string[] = []
    /**
     * A page that only reads the location.
     *
     * @returns What it read, recorded per commit.
     */
    function Page(): JSX.Element {
      const location = useLocation()
      return <CommittedValue value={location.pathname} into={commits} />
    }
    render(<Shell page={Page} />)
    expect(commits).toEqual(['/items/1'])
  })

  it('a parent reading the location shows the navigation a child makes as it mounts', () => {
    const router = createMemoryRouter({ initialEntries: ['/start'] })
    /**
     * Redirects as it mounts, as a guard does. Its effect runs before its parent's.
     *
     * @returns Nothing.
     */
    function Child(): null {
      const navigate = useNavigate()
      useEffect(() => navigate('/moved'), [navigate])
      return null
    }
    /**
     * Shows the path, as a layout computing its active item does.
     *
     * @returns The path and the child.
     */
    function Parent(): JSX.Element {
      const { pathname } = useLocation()
      return (
        <p>
          {pathname}
          <Child />
        </p>
      )
    }
    const { container } = render(
      <RouterProvider router={router}>
        <Parent />
      </RouterProvider>,
    )
    expect(container.textContent).toBe('/moved')
  })
})

describe('RoutedView', () => {
  it("renders the routed view the routing bond's RouterProvider was given", () => {
    const router = createMemoryRouter()
    /**
     * The bond's outlet.
     *
     * @returns The routed page.
     */
    const Outlet = (): JSX.Element => <p>routed page</p>
    const { container } = render(
      <RouterProvider router={router} routedView={Outlet}>
        <RoutedView />
      </RouterProvider>,
    )
    expect(container.textContent).toBe('routed page')
  })

  it('throws a translatable error naming the fix when the bond has no routed view', () => {
    const router = createMemoryRouter()
    let thrown: unknown
    try {
      render(
        <RouterProvider router={router}>
          <RoutedView />
        </RouterProvider>,
      )
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('react.error.noRoutedView')
    expect((thrown as Error).message).toMatch(/pass the page as children/)
  })

  it('names the fix when a routing hook runs with no router', () => {
    /**
     * Reads the router with none provided.
     *
     * @returns Nothing.
     */
    function NoRouter(): null {
      useRouterInstance()
      return null
    }
    let thrown: unknown
    try {
      render(<NoRouter />)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('react.error.useRouterOutsideProvider')
    expect((thrown as Error).message).toMatch(/routing bond/)
  })
})
