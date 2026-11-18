import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

// Shared framework mocks, defined before vi.mock hoisting.
const { mockVueRouter, mockRoute } = vi.hoisted(() => {
  // The route the bond reads through the live currentRoute (not a passed snapshot).
  const mockRoute: RouteLocationNormalizedLoaded = {
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
  const mockVueRouter: {
    currentRoute: { value: RouteLocationNormalizedLoaded }
    push: Mock<(path: string) => Promise<void>>
    replace: Mock<(path: string) => Promise<void>>
    back: Mock<() => void>
    forward: Mock<() => void>
    go: Mock<(delta: number) => void>
    resolve: Mock<(to: { name: string }) => { fullPath: string }>
    afterEach: Mock<() => () => void>
    options: { history: { state: { position: number }; listen: Mock<() => () => void> } }
  } = {
    currentRoute: { value: mockRoute },
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
  return { mockVueRouter, mockRoute }
})

// @molecule/app-routing with only the bond overridden, so navigate() delegates to whatever
// is bonded (the provider singleton needs the real createBrowserRouter at import time).
let bonded: { navigate: (path: string, options?: unknown) => unknown } | null = null
vi.mock('@molecule/app-routing', async (importOriginal) => {
  const actual = await importOriginal<typeof actualAppRouting>()
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
  // Vue Router's route before its first navigation; no mock route is this object.
  START_LOCATION: { path: '/', fullPath: '/', hash: '', params: {} },
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

// The real module's types, for `importOriginal` below (type-only: erased at runtime).
import type * as actualAppRouting from '@molecule/app-routing'
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
