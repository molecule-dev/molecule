// @vitest-environment jsdom
/**
 * `MoleculeRouterProvider` bonds its router through `@molecule/app-routing`'s `setRouter` on
 * mount, so core's `navigate()` drives the real React Router, rendered for real under React
 * Router's own `MemoryRouter`.
 */
import { act, cleanup, render } from '@testing-library/react'
import type { JSX } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getRouter, navigate as coreNavigate, type Router, setRouter } from '@molecule/app-routing'

import { MoleculeRouterProvider } from '../index.js'

const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

const originalBond = getRouter()

afterEach(() => {
  cleanup()
  setRouter(originalBond)
})

/**
 * Shows React Router's own location.
 *
 * @returns The path.
 */
function NativePath(): JSX.Element {
  return <output aria-label="native path">{useLocation().pathname}</output>
}

/**
 * Mounts the provider under React Router's own memory router.
 *
 * @param onRouterReady - The provider's callback.
 * @returns The rendered view.
 */
const mount = (onRouterReady?: (router: Router) => void): ReturnType<typeof render> =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <MoleculeRouterProvider onRouterReady={onRouterReady}>
        <NativePath />
      </MoleculeRouterProvider>
    </MemoryRouter>,
  )

describe('MoleculeRouterProvider wiring (react-router)', () => {
  it('bonds the adapter via setRouter on mount', () => {
    mount()

    const adapter = getRouter()
    expect(adapter).not.toBe(originalBond)
    expect(adapter.navigate).toBeInstanceOf(Function)
    expect(adapter.getLocation().pathname).toBe('/')
  })

  it('core navigate() drives the real React Router navigate after mount', async () => {
    const view = mount()

    // navigate() from @molecule/app-routing — NOT the react-router hook — must reach
    // the real React Router navigate through the bonded adapter.
    await act(async () => {
      await coreNavigate('/dashboard')
    })

    expect(view.getByLabelText('native path').textContent).toBe('/dashboard')
  })

  it('still invokes the optional onRouterReady callback with the bonded router', () => {
    const onRouterReady = vi.fn<(router: Router) => void>()
    mount(onRouterReady)

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())
  })
})
