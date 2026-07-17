import { beforeEach, describe, expect, it, vi } from 'vitest'

// t() just echoes its defaultValue (provider.ts uses it for error messages).
vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

// Minimal @molecule/app-routing bond so navigate() delegates to whatever is bonded.
let bonded: { navigate: (path: string, options?: unknown) => unknown } | null = null
vi.mock('@molecule/app-routing', () => ({
  setRouter: vi.fn((router: { navigate: (p: string, o?: unknown) => unknown }) => {
    bonded = router
  }),
  getRouter: () => bonded,
  navigate: (path: string, options?: unknown) => bonded?.navigate(path, options),
}))

// Run memos/effects synchronously so calling the hook performs the bond.
vi.mock('react', () => ({
  useMemo: (fn: () => unknown) => fn(),
  useEffect: (fn: () => void) => {
    fn()
  },
}))

import { navigate as coreNavigate, setRouter } from '@molecule/app-routing'

import { useMoleculeRouter } from '../index.js'
import type { NavigationRef } from '../types.js'

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

const createMockNavigationRef = (overrides: Partial<NavigationRef> = {}): NavigationRef => ({
  navigate: vi.fn(),
  goBack: vi.fn(),
  canGoBack: vi.fn().mockReturnValue(true),
  getCurrentRoute: vi.fn().mockReturnValue({ name: 'Home', params: {}, key: 'h-1' }),
  getState: vi.fn().mockReturnValue(undefined),
  dispatch: vi.fn(),
  addListener: vi.fn().mockReturnValue(vi.fn()),
  ...overrides,
})

describe('useMoleculeRouter wiring (react-navigation)', () => {
  beforeEach(() => {
    bonded = null
    vi.mocked(setRouter).mockClear()
  })

  it('bonds the adapter via setRouter on mount', () => {
    const navigationRef = createMockNavigationRef()
    const router = useMoleculeRouter({
      navigationRef,
      linking: { screens: { Home: '/', Products: '/products' } },
    })

    expect(setRouter).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setRouter).mock.calls[0][0]).toBe(router)
    expect(router.navigate).toBeInstanceOf(Function)
  })

  it('core navigate() drives the real React Navigation navigator after mount', async () => {
    const navigationRef = createMockNavigationRef()
    useMoleculeRouter({
      navigationRef,
      linking: { screens: { Home: '/', Products: '/products' } },
    })

    coreNavigate('/products')
    await flush()

    expect(navigationRef.navigate).toHaveBeenCalledWith('Products', {})
  })
})
