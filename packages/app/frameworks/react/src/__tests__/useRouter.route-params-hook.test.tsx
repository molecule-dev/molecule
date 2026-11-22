// @vitest-environment jsdom

/**
 * `RouterProvider`'s `useRouteParams`: the hook a routing bond supplies when its native router
 * scopes route params to the calling component (React Router's `useParams`, empty above the
 * matched route). React-only, so this file is in the conformance gate's `TITLE_PARITY_EXEMPT`:
 * every other native router answers params at the router's root, and no other binding takes
 * such a hook.
 *
 * @module
 */

import { act, render } from '@testing-library/react'
import { createContext, type JSX, type ReactNode, useContext, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { RouteParams } from '@molecule/app-routing'
import { createMemoryRouter } from '@molecule/app-routing'

import { useParams, useRouter } from '../hooks/useRouter.js'
import { RouterProvider } from '../providers.js'

/** The params the fake bond's route gives the component under it, as React Router's would. */
const RouteParamsOfRoute = createContext<RouteParams>({})

/**
 * A routing bond's hook: the params of the route the caller is under.
 *
 * @returns Those params.
 */
const useBondRouteParams = (): RouteParams => useContext(RouteParamsOfRoute)

/**
 * Renders the caller's `useParams()` as JSON.
 *
 * @returns The params as text.
 */
function ShowParams(): JSX.Element {
  return <p data-params="">{JSON.stringify(useParams())}</p>
}

/**
 * Renders `children` under a route that gives `params`.
 *
 * @param props - The params and the children.
 * @param props.params - The route's params.
 * @param props.children - What renders under the route.
 * @returns The route.
 */
function Route({ params, children }: { params: RouteParams; children: ReactNode }): JSX.Element {
  return <RouteParamsOfRoute.Provider value={params}>{children}</RouteParamsOfRoute.Provider>
}

const paramsText = (container: HTMLElement): unknown[] =>
  [...container.querySelectorAll('[data-params]')].map((node) =>
    JSON.parse(node.textContent ?? 'null'),
  )

describe("RouterProvider's useRouteParams", () => {
  it("useParams returns the routing bond's params for the calling component", () => {
    const router = createMemoryRouter({ initialEntries: ['/users/7'] })
    const { container } = render(
      <RouterProvider router={router} useRouteParams={useBondRouteParams}>
        <ShowParams />
        <Route params={{ id: '7' }}>
          <ShowParams />
        </Route>
      </RouterProvider>,
    )
    // Above the route the bond gives none and the router answers (no route definitions: none).
    expect(paramsText(container)).toEqual([{}, { id: '7' }])
  })

  it("useRouter().params falls back to the router's params when the hook gives none", () => {
    const router = createMemoryRouter({
      initialEntries: ['/users/7'],
      routes: [{ path: '/users/:id' }],
    })
    let params: RouteParams | undefined
    function ReadsRouter(): null {
      params = useRouter().params
      return null
    }
    render(
      <RouterProvider router={router} useRouteParams={useBondRouteParams}>
        <ReadsRouter />
      </RouterProvider>,
    )
    expect(params).toEqual({ id: '7' })
  })

  it('keeps the same params object while the entries are the same', () => {
    const router = createMemoryRouter({ initialEntries: ['/users/7'] })
    const seen: RouteParams[] = []
    let rerender: (() => void) | undefined
    function Records(): null {
      const [, setCount] = useState(0)
      rerender = () => setCount((count) => count + 1)
      seen.push(useParams())
      return null
    }
    // A new params object on every render, as React Router builds when `<Routes>` re-renders.
    function FreshParams({ children }: { children: ReactNode }): JSX.Element {
      return <Route params={{ id: '7' }}>{children}</Route>
    }
    render(
      <RouterProvider router={router} useRouteParams={useBondRouteParams}>
        <FreshParams>
          <Records />
        </FreshParams>
      </RouterProvider>,
    )
    act(() => rerender?.())
    expect(seen.length).toBeGreaterThan(1)
    expect(new Set(seen).size).toBe(1)
  })

  it('reads the hook once: a different hook passed later changes nothing and breaks no hook order', () => {
    const router = createMemoryRouter({ initialEntries: ['/users/7'] })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const useOtherParams = (): RouteParams => {
      useState(0)
      return { id: 'other' }
    }
    const tree = (hook: () => RouteParams): JSX.Element => (
      <RouterProvider router={router} useRouteParams={hook}>
        <Route params={{ id: '7' }}>
          <ShowParams />
        </Route>
      </RouterProvider>
    )
    const { container, rerender } = render(tree(useBondRouteParams))
    rerender(tree(useOtherParams))
    expect(paramsText(container)).toEqual([{ id: '7' }])
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("a RouterProvider inside another without the hook reads its own router's params", () => {
    const outer = createMemoryRouter({ initialEntries: ['/users/7'] })
    const inner = createMemoryRouter({
      initialEntries: ['/teams/3'],
      routes: [{ path: '/teams/:team' }],
    })
    const { container } = render(
      <RouterProvider router={outer} useRouteParams={useBondRouteParams}>
        <Route params={{ id: '7' }}>
          <RouterProvider router={inner}>
            <ShowParams />
          </RouterProvider>
        </Route>
      </RouterProvider>,
    )
    expect(paramsText(container)).toEqual([{ team: '3' }])
  })
})
