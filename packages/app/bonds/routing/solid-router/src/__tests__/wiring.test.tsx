/**
 * The titles of React's `wiring.test.tsx` over this bond: the provider is mounted in a
 * real Solid memory router, `@molecule/app-routing`'s `setRouter` is mocked so the test
 * can see what was bonded, and the mocked `navigate()` delegates to that bonded adapter —
 * so a core navigation proves it reaches the REAL Solid Router, not a fallback.
 */
import { MemoryRouter } from '@solidjs/router'
import { render } from 'solid-js/web'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NavigateOptions, Router } from '@molecule/app-routing'
import { navigate as coreNavigate, setRouter } from '@molecule/app-routing'

import { createSolidMemoryHistory } from '../memory-history.js'
import type { SolidMemoryHistory } from '../types.js'

// A minimal @molecule/app-routing bond around the REAL core: the provider builds its
// router with the actual createHistoryRouter, while setRouter stores the adapter and
// navigate() delegates to whatever is bonded.
let bonded: Router | null = null
vi.mock('@molecule/app-routing', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    setRouter: vi.fn((router: Router) => {
      bonded = router
    }),
    getRouter: () => bonded,
    navigate: (path: string, options?: NavigateOptions): void => {
      bonded?.navigate(path, options)
    },
  }
})

import { MoleculeRouterProvider } from '../index.js'

// Flush macrotasks so a navigation in flight commits
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Waits until a navigation in flight has committed.
 *
 * @returns A promise that settles after the router has committed.
 */
const settle = async (): Promise<void> => {
  for (let round = 0; round < 4; round++) await flush()
}

/**
 * Mounts the provider in a real Solid memory router, with no routes.
 *
 * @param history - The memory history the native router runs on.
 * @param options - The `onRouterReady` callback to hand the provider.
 * @returns The unmount function.
 */
const mountProvider = (
  history: SolidMemoryHistory,
  options: { onRouterReady?: (router: Router) => void } = {},
): (() => void) => {
  const container = document.createElement('div')
  return render(
    () => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <MoleculeRouterProvider history={history} onRouterReady={options.onRouterReady}>
            {props.children}
          </MoleculeRouterProvider>
        )}
      />
    ),
    container,
  )
}

beforeEach(() => {
  bonded = null
  vi.mocked(setRouter).mockClear()
  window.history.replaceState(null, '', '/')
})

describe('MoleculeRouterProvider wiring (solid-router)', () => {
  it('bonds the adapter via setRouter on mount', () => {
    const dispose = mountProvider(createSolidMemoryHistory(['/']))

    expect(setRouter).toHaveBeenCalledTimes(1)
    const adapter = vi.mocked(setRouter).mock.calls[0][0]
    expect(adapter).toBeDefined()
    expect(adapter.navigate).toBeInstanceOf(Function)

    dispose()
  })

  it('core navigate() drives the real React Router navigate after mount', async () => {
    const history = createSolidMemoryHistory(['/'])
    const dispose = mountProvider(history)

    // navigate() from @molecule/app-routing — NOT the Solid Router hook — must reach
    // the real Solid Router navigate through the bonded adapter.
    coreNavigate('/dashboard')
    await settle()

    expect(history.get()).toBe('/dashboard')

    dispose()
  })

  it('still invokes the optional onRouterReady callback with the bonded router', () => {
    const onRouterReady = vi.fn<(router: Router) => void>()
    const dispose = mountProvider(createSolidMemoryHistory(['/']), { onRouterReady })

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(vi.mocked(setRouter).mock.calls[0][0])

    dispose()
  })
})
