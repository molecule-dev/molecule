import { beforeEach, describe, expect, it, vi } from 'vitest'

// Minimal @molecule/app-routing bond (navigate() delegates to the bonded router) plus
// the utility fns next's utilities.ts re-exports from core at runtime.
let bonded: { navigate: (path: string, options?: unknown) => unknown } | null = null
vi.mock('@molecule/app-routing', () => ({
  setRouter: vi.fn((router: { navigate: (p: string, o?: unknown) => unknown }) => {
    bonded = router
  }),
  getRouter: () => bonded,
  navigate: (path: string, options?: unknown) => bonded?.navigate(path, options),
  parseQuery: (search: string) => {
    const params: Record<string, string> = {}
    const query = search.startsWith('?') ? search.slice(1) : search
    if (!query) return params
    query.split('&').forEach((part) => {
      const [key, value] = part.split('=')
      params[decodeURIComponent(key)] = decodeURIComponent(value ?? '')
    })
    return params
  },
  stringifyQuery: (params: Record<string, string | string[] | undefined>) => {
    const entries = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) =>
        Array.isArray(v)
          ? v.map((val) => `${encodeURIComponent(k)}=${encodeURIComponent(val)}`).join('&')
          : `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`,
      )
    return entries.length ? `?${entries.join('&')}` : ''
  },
  matchPath: (pattern: string, path: string) =>
    pattern === path ? { path, pathname: path } : null,
  generatePath: (pattern: string) => pattern,
}))

// Run memos/effects synchronously so calling the hook performs the bond.
vi.mock('react', () => ({
  useMemo: (fn: () => unknown) => fn(),
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
    bonded = null
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
