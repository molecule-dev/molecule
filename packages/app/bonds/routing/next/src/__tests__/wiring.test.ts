import type * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppRouting from '@molecule/app-routing'

// The REAL core router module, with `setRouter` wrapped so the test can observe the
// bond while the real bond registry still receives the router — that is the wiring
// under test: core navigate() must reach the bonded adapter.
vi.mock('@molecule/app-routing', async (importOriginal) => {
  // Type the original as the module it stands in for, so the spread and the wrapped
  // `setRouter` keep the real module's types (`importOriginal` defaults to `unknown`).
  const actual = await importOriginal<typeof AppRouting>()
  return { ...actual, setRouter: vi.fn(actual.setRouter) }
})

// Run state/effect hooks synchronously so calling the hook performs the bond. The hook
// builds ONE router in `useState` (not a `useMemo` snapshot), so the mock replaces
// `useRef`/`useState`/`useEffect` (the bond's effect outside a browser) and keeps the rest
// of React, which `@molecule/app-react` (behind the package entry) builds its contexts with.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>()
  return {
    ...actual,
    useRef: <T>(value: T) => ({ current: value }),
    useState: <T>(init: () => T) => {
      const value = init()
      return [value, () => {}] as const
    },
    useEffect: (fn: () => void) => {
      fn()
    },
  }
})

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
