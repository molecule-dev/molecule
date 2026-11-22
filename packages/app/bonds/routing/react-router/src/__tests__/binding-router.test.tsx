// @vitest-environment jsdom
/**
 * The bond gives `@molecule/app-react` its router: the binding's routing hooks read the bonded
 * router, `RoutedView` in a layout route renders the matched child (React Router's `Outlet`), a
 * provider inside another uses the outer one's router, a page reads its route params through
 * `useMoleculeRouter` with no route definitions, and what `useMoleculeRouter` returns shares the
 * bonded router's guards, routes and navigation. Every routing bond carries these titles.
 */
import { act, cleanup, render } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { MemoryRouter as NativeMemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  RoutedView,
  useLocation,
  useNavigate,
  useParams,
  useRouterInstance,
} from '@molecule/app-react'
import { getRouter, type RouteParams, type Router, setRouter } from '@molecule/app-routing'

import { MemoryRouter, MoleculeRouterProvider, useMoleculeRouter } from '../index.js'

const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

const originalBond = getRouter()

afterEach(() => {
  cleanup()
  setRouter(originalBond)
})

describe('MoleculeRouterProvider and the framework binding', () => {
  it('gives the framework binding the router it bonds', async () => {
    let bonded: Router | undefined
    let seen: Router | undefined
    let go: ((path: string) => void) | undefined
    function Probe(): JSX.Element {
      seen = useRouterInstance()
      const navigate = useNavigate()
      go = (path) => void navigate(path)
      return <span data-probe="">{useLocation().pathname}</span>
    }
    const view = render(
      <MemoryRouter initialEntries={['/one']}>
        <MoleculeRouterProvider onRouterReady={(router) => (bonded = router)}>
          <Probe />
          <Routes>
            <Route path="/one" element={<p>page one</p>} />
            <Route path="/two" element={<p>page two</p>} />
          </Routes>
        </MoleculeRouterProvider>
      </MemoryRouter>,
    )
    expect(seen).toBeDefined()
    expect(seen).toBe(bonded)
    expect(view.container.querySelector('[data-probe]')?.textContent).toBe('/one')

    await act(async () => go?.('/two'))
    expect(view.container.querySelector('[data-probe]')?.textContent).toBe('/two')
    expect(view.container.textContent).toContain('page two')
  })

  it("puts the native router's matched child route where a layout route renders its page", async () => {
    let go: ((path: string) => void) | undefined
    function Layout(): JSX.Element {
      const navigate = useNavigate()
      go = (path) => void navigate(path)
      return (
        <main data-layout="">
          <RoutedView />
        </main>
      )
    }
    const view = render(
      <MemoryRouter initialEntries={['/one']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="one" element={<p>page one</p>} />
            <Route path="two" element={<p>page two</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(view.container.querySelector('[data-layout]')?.textContent).toBe('page one')

    await act(async () => go?.('/two'))
    expect(view.container.querySelector('[data-layout]')?.textContent).toBe('page two')
  })

  it('a provider inside another uses the outer router, registers its routes and calls onRouterReady once', async () => {
    let outer: Router | undefined
    const innerReady = vi.fn<(router: Router) => void>()
    const routes = [{ path: '/items/:id', name: 'item' }]
    render(
      <NativeMemoryRouter initialEntries={['/']}>
        <MoleculeRouterProvider onRouterReady={(router) => (outer = router)}>
          <MoleculeRouterProvider routes={routes} onRouterReady={innerReady}>
            <Routes>
              <Route path="/" element={<p>home</p>} />
              <Route path="/items/:id" element={<p>item</p>} />
            </Routes>
          </MoleculeRouterProvider>
        </MoleculeRouterProvider>
      </NativeMemoryRouter>,
    )
    await act(async () => getRouter().navigate('/items/7'))

    expect(outer).toBeDefined()
    expect(innerReady).toHaveBeenCalledTimes(1)
    expect(innerReady).toHaveBeenCalledWith(outer)
    expect(getRouter()).toBe(outer)
    expect(outer?.getRoutes()).toEqual(expect.arrayContaining(routes))
  })

  it('a page reads its route params through useMoleculeRouter with no route definitions', async () => {
    const seen: { router: RouteParams; binding: RouteParams }[] = []
    function Page(): JSX.Element {
      const router = useMoleculeRouter()
      const binding = useParams()
      seen.push({ router: router.getParams(), binding })
      return <p>{binding.account}</p>
    }
    render(
      <MemoryRouter initialEntries={['/settings/team']}>
        <Routes>
          <Route path="/settings/:account" element={<Page />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(seen.at(-1)).toEqual({ router: { account: 'team' }, binding: { account: 'team' } })

    seen.length = 0
    await act(async () => getRouter().navigate('/settings/personal'))
    expect(seen.length).toBeGreaterThan(0)
    // No render paired the new page with the previous params.
    expect(seen).toEqual(
      seen.map(() => ({ router: { account: 'personal' }, binding: { account: 'personal' } })),
    )
  })

  it("useMoleculeRouter shares the bonded router's guards, named routes and navigation", async () => {
    const routes = [{ path: '/settings/:account', name: 'settings' }]
    const returned: Router[] = []
    let rerender: (() => void) | undefined
    function Page(): JSX.Element {
      const [, setCount] = useState(0)
      rerender = () => setCount((count) => count + 1)
      returned.push(useMoleculeRouter())
      return <p>page</p>
    }
    render(
      <MemoryRouter initialEntries={['/settings/team']}>
        <MoleculeRouterProvider routes={routes}>
          <Routes>
            <Route path="/settings/:account" element={<Page />} />
            <Route path="/blocked" element={<p>blocked</p>} />
          </Routes>
        </MoleculeRouterProvider>
      </MemoryRouter>,
    )
    const router = returned[0]
    expect(router.getRoutes()).toEqual(getRouter().getRoutes())
    expect(router.generatePath('settings', { account: 'personal' })).toBe('/settings/personal')

    await act(async () => router.navigateTo('settings', { account: 'personal' }))
    expect(getRouter().getLocation().pathname).toBe('/settings/personal')

    // A guard added through the component's router stops a navigation the bonded router starts.
    const removeGuard = router.addGuard((to) => !to.pathname.startsWith('/blocked'))
    await act(async () => getRouter().navigate('/blocked'))
    expect(getRouter().getLocation().pathname).toBe('/settings/personal')
    removeGuard()

    act(() => rerender?.())
    expect(new Set(returned).size).toBe(1)
  })
})
