// @vitest-environment jsdom
/**
 * Route params under React Router, which scopes them to the matched route: `useParams()` is
 * empty at the router's root and holds the route's params in its element. So the bond reads
 * them where the component is. React Router only (every other native router answers params at
 * the root), so this file is in the conformance gate's `TITLE_PARITY_EXEMPT`.
 */
import { act, cleanup, render } from '@testing-library/react'
import type { JSX } from 'react'
import { createMemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { useParams } from '@molecule/app-react'
import { getRouter, type RouteParams, setRouter } from '@molecule/app-routing'

import { RouterProvider as DomRouterProvider } from '../dom.js'
import {
  MemoryRouter,
  MoleculeRouterProvider,
  RouterProvider,
  useMoleculeRouter,
} from '../index.js'

const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

const originalBond = getRouter()
const disposers: (() => void)[] = []

afterEach(() => {
  cleanup()
  for (const dispose of disposers.splice(0)) dispose()
  setRouter(originalBond)
})

/**
 * Records what `useMoleculeRouter().getParams()` and the binding's `useParams()` read.
 *
 * @param props - Where to record.
 * @param props.seen - The array each render appends to.
 * @returns The params as text.
 */
function ReadsParams({
  seen,
}: {
  seen: { router: RouteParams; binding: RouteParams }[]
}): JSX.Element {
  const router = useMoleculeRouter()
  const binding = useParams()
  seen.push({ router: router.getParams(), binding })
  return <output>{JSON.stringify(binding)}</output>
}

describe('route params under React Router', () => {
  it('a component outside every route reads no params unless route definitions name them', () => {
    const outside: { router: RouteParams; binding: RouteParams }[] = []
    const about: { router: RouteParams; binding: RouteParams }[] = []
    const tree = (routes?: { path: string }[]): JSX.Element => (
      <MemoryRouter initialEntries={['/settings/team']}>
        <MoleculeRouterProvider routes={routes}>
          <ReadsParams seen={outside} />
          <Routes>
            <Route path="/settings/:account" element={<p>settings</p>} />
            <Route path="/about" element={<ReadsParams seen={about} />} />
          </Routes>
        </MoleculeRouterProvider>
      </MemoryRouter>
    )
    render(tree())
    expect(outside.at(-1)).toEqual({ router: {}, binding: {} })
    cleanup()

    render(tree([{ path: '/settings/:account' }]))
    expect(outside.at(-1)).toEqual({ router: { account: 'team' }, binding: { account: 'team' } })

    act(() => {
      void getRouter().navigate('/about')
    })
    expect(about.at(-1)).toEqual({ router: {}, binding: {} })
  })

  it("a component kept across two routes reads each route's params, not the first one's", async () => {
    const seen: { router: RouteParams; binding: RouteParams }[] = []
    // One element type for both routes: React keeps the instance when the match changes.
    const page = <ReadsParams seen={seen} />
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/a" element={page} />
          <Route path="/a/:id" element={page} />
        </Routes>
      </MemoryRouter>,
    )
    expect(seen.at(-1)).toEqual({ router: {}, binding: {} })

    await act(async () => getRouter().navigate('/a/7'))
    expect(seen.at(-1)).toEqual({ router: { id: '7' }, binding: { id: '7' } })

    await act(async () => getRouter().navigate('/a'))
    expect(seen.at(-1)).toEqual({ router: {}, binding: {} })
  })

  it.each([
    ['RouterProvider', RouterProvider],
    ['the /dom RouterProvider', DomRouterProvider],
  ] as const)(
    "%s gives the binding and getRouter() the data router's matched params",
    (_name, provider) => {
      const Provider = provider
      const seen: { router: RouteParams; binding: RouteParams }[] = []
      const dataRouter = createMemoryRouter(
        [{ path: '/settings/:account', element: <ReadsParams seen={seen} /> }],
        { initialEntries: ['/settings/team'] },
      )
      disposers.push(() => dataRouter.dispose())
      render(<Provider router={dataRouter} />)

      expect(seen.at(-1)).toEqual({ router: { account: 'team' }, binding: { account: 'team' } })
      expect(getRouter().getParams()).toEqual({ account: 'team' })

      act(() => {
        void getRouter().navigate('/settings/personal')
      })
      expect(seen.at(-1)).toEqual({
        router: { account: 'personal' },
        binding: { account: 'personal' },
      })
      expect(getRouter().getParams()).toEqual({ account: 'personal' })
      expect(getRouter().getLocation().pathname).toBe('/settings/personal')
    },
  )
})
