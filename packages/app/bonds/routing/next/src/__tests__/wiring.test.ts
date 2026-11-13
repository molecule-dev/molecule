import { beforeEach, describe, expect, it, vi } from 'vitest'

// The REAL core router module, with `setRouter` wrapped so the test can observe the
// bond while the real bond registry still receives the router — that is the wiring
// under test: core navigate() must reach the bonded adapter.
vi.mock('@molecule/app-routing', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, setRouter: vi.fn(actual.setRouter) }
})

// Run state/effect hooks synchronously so calling the hook performs the bond. The hook
// now builds ONE router in `useState` (not a `useMemo` snapshot), so the mock provides
// `useRef`/`useState` instead of `useMemo`.
vi.mock('react', () => ({
  useRef: <T>(value: T) => ({ current: value }),
  useState: <T>(init: () => T) => {
    const value = init()
    return [value, () => {}] as const
  },
  useEffect: (fn: () => void) => {
    fn()
  },
}))

import { navigate as coreNavigate, setRouter } from '@molecule/app-routing'

import type { NextNavigation } from '../index.js'
import { useMoleculeRouter } from '../index.js'

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

const createMockNavigation = (): NextNavigation => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
})

describe('useMoleculeRouter wiring (next)', () => {
  beforeEach(() => {
    vi.mocked(setRouter).mockClear()
  })

  it('bonds the adapter via setRouter on mount', () => {
    const navigation = createMockNavigation()
    const router = useMoleculeRouter({ navigation, pathname: '/' })

    expect(setRouter).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setRouter).mock.calls[0][0]).toBe(router)
    expect(router.navigate).toBeInstanceOf(Function)
  })

  it('core navigate() drives the real Next App Router push after mount', async () => {
    const navigation = createMockNavigation()
    useMoleculeRouter({ navigation, pathname: '/' })

    coreNavigate('/products')
    await flush()

    expect(navigation.push).toHaveBeenCalledWith('/products')
  })

  it('core navigate({ replace }) drives the App Router replace', async () => {
    const navigation = createMockNavigation()
    useMoleculeRouter({ navigation, pathname: '/' })

    coreNavigate('/login', { replace: true })
    await flush()

    expect(navigation.replace).toHaveBeenCalledWith('/login')
  })
})
