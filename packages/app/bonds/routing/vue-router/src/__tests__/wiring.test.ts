import { beforeEach, describe, expect, it, vi } from 'vitest'

// Shared framework mocks, defined before vi.mock hoisting.
const { mockVueRouter, mockRoute } = vi.hoisted(() => {
  const mockVueRouter = {
    // The bond reads the live currentRoute (not a passed snapshot).
    currentRoute: { value: null as unknown },
    push: vi.fn(async (path: string) => {
      mockVueRouter.currentRoute.value = {
        ...mockVueRouter.currentRoute.value,
        path,
        fullPath: path,
      }
    }),
    replace: vi.fn(async (path: string) => {
      mockVueRouter.currentRoute.value = {
        ...mockVueRouter.currentRoute.value,
        path,
        fullPath: path,
      }
    }),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    resolve: vi.fn((to: { name: string }) => ({ fullPath: `/${to.name}` })),
    afterEach: vi.fn(() => () => {}),
    options: { history: { state: { position: 0 }, listen: vi.fn(() => () => {}) } },
  }
  const mockRoute = {
    path: '/',
    fullPath: '/',
    hash: '',
    query: {},
    params: {},
    meta: {},
    name: 'home',
    matched: [],
    redirectedFrom: undefined,
  }
  mockVueRouter.currentRoute.value = mockRoute
  return { mockVueRouter, mockRoute }
})

// @molecule/app-routing with only the bond overridden, so navigate() delegates to whatever
// is bonded (the provider singleton needs the real createBrowserRouter at import time).
let bonded: { navigate: (path: string, options?: unknown) => unknown } | null = null
vi.mock('@molecule/app-routing', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    setRouter: vi.fn((router: { navigate: (p: string, o?: unknown) => unknown }) => {
      bonded = router
    }),
    getRouter: () => bonded,
    navigate: (path: string, options?: unknown) => bonded?.navigate(path, options),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mockVueRouter,
  useRoute: () => mockRoute,
}))

// computed → { value }, watch → run immediately with the unwrapped value.
vi.mock('vue', () => ({
  computed: (fn: () => unknown) => ({ value: fn() }),
  ref: (val: unknown) => ({ value: val }),
  watch: (
    source: { value: unknown },
    cb: (value: unknown, oldValue: unknown, onCleanup: (fn: () => void) => void) => void,
    opts?: { immediate?: boolean },
  ) => {
    if (opts?.immediate) cb(source.value, undefined, () => {})
  },
  onUnmounted: vi.fn(),
}))

import { navigate as coreNavigate, setRouter } from '@molecule/app-routing'

import { useMoleculeRouterProvider } from '../index.js'

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

describe('useMoleculeRouterProvider wiring (vue-router)', () => {
  beforeEach(() => {
    bonded = null
    mockVueRouter.push.mockClear()
    mockVueRouter.replace.mockClear()
    vi.mocked(setRouter).mockClear()
  })

  it('bonds the adapter via setRouter in an immediate watch', () => {
    const router = useMoleculeRouterProvider()

    expect(setRouter).toHaveBeenCalledTimes(1)
    const adapter = vi.mocked(setRouter).mock.calls[0][0]
    expect(adapter).toBe(router.value)
    expect(adapter.navigate).toBeInstanceOf(Function)
  })

  it('core navigate() drives the real Vue Router push after setup', async () => {
    useMoleculeRouterProvider()

    coreNavigate('/products')
    await flush()

    expect(mockVueRouter.push).toHaveBeenCalledWith('/products')
  })

  it('core navigate({ replace }) drives Vue Router replace', async () => {
    useMoleculeRouterProvider()

    coreNavigate('/login', { replace: true })
    await flush()

    expect(mockVueRouter.replace).toHaveBeenCalledWith('/login')
  })
})
