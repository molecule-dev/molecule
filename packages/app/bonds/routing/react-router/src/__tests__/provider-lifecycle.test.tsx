// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react'
import React, { StrictMode, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getRouter, type Router } from '@molecule/app-routing'

import { MemoryRouter, MoleculeRouterProvider } from '../index.js'

afterEach(() => cleanup())

describe('MoleculeRouterProvider lifecycle', () => {
  it('shows a page mounted by a navigation the new location in its first render', async () => {
    const firstRenderPaths: string[] = []
    let go: ReturnType<typeof useNavigate> | undefined

    // Reads the location the way `@molecule/app-react`'s `useRouter` does: in a state initializer.
    function Page() {
      const [path] = useState(() => getRouter().getLocation().pathname)
      firstRenderPaths.push(path)
      return null
    }
    function Home() {
      const navigate = useNavigate()
      go = navigate
      return null
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <MoleculeRouterProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/page" element={<Page />} />
          </Routes>
        </MoleculeRouterProvider>
      </MemoryRouter>,
    )

    await act(async () => {
      await go?.('/page')
    })

    expect(firstRenderPaths[0]).toBe('/page')
  })

  it('calls onRouterReady once with the bonded router under StrictMode', () => {
    const onRouterReady = vi.fn<(router: Router) => void>()

    render(
      <StrictMode>
        <MemoryRouter>
          <MoleculeRouterProvider onRouterReady={onRouterReady}>
            <p>app</p>
          </MoleculeRouterProvider>
        </MemoryRouter>
      </StrictMode>,
    )

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())
  })

  it('does not call onRouterReady again when only the callback changes', () => {
    const first = vi.fn<(router: Router) => void>()
    const second = vi.fn<(router: Router) => void>()
    const tree = (callback: (router: Router) => void) => (
      <MemoryRouter>
        <MoleculeRouterProvider onRouterReady={callback}>
          <p>app</p>
        </MoleculeRouterProvider>
      </MemoryRouter>
    )

    const view = render(tree(first))
    view.rerender(tree(second))

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })
})
