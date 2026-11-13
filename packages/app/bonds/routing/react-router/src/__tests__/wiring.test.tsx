import { beforeEach, describe, expect, it, vi } from 'vitest'

// A minimal @molecule/app-routing bond around the REAL core: the provider builds its
// router with the actual createHistoryRouter, while setRouter stores the adapter and
// navigate() delegates to whatever is bonded — so we can prove the provider's mount-time
// setRouter drives the REAL React Router (not a fallback).
let bonded: { navigate: (path: string, options?: unknown) => unknown } | null = null
vi.mock('@molecule/app-routing', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    setRouter: vi.fn((router: { navigate: (p: string, o?: unknown) => unknown }) => {
      bonded = router
    }),
    getRouter: () => bonded,
    navigate: (path: string, options?: unknown) => bonded?.navigate(path, options),
  }
})

// The real React Router navigate spy the adapter must ultimately call.
const navigateFn = vi.fn()
vi.mock('react-router', () => ({
  useNavigate: () => navigateFn,
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: undefined, key: 'k' }),
  useParams: () => ({}),
  useNavigationType: () => 'PUSH',
  useSearchParams: () => [new URLSearchParams(''), vi.fn()],
}))

// Run effects/memos synchronously so calling the component function performs the bond.
vi.mock('react', () => ({
  default: {},
  createContext: () => ({ Provider: ({ children }: { children: unknown }) => children }),
  useContext: vi.fn(),
  useState: (initial: unknown) => [
    typeof initial === 'function' ? (initial as () => unknown)() : initial,
    vi.fn(),
  ],
  useRef: (initial: unknown) => ({ current: initial }),
  useMemo: (fn: () => unknown) => fn(),
  useEffect: (fn: () => void) => {
    fn()
  },
}))

vi.mock('react/jsx-runtime', () => ({
  jsx: (type: unknown, props: unknown) => ({ type, props }),
  jsxs: (type: unknown, props: unknown) => ({ type, props }),
  Fragment: 'Fragment',
}))

import { navigate as coreNavigate, setRouter } from '@molecule/app-routing'

import { MoleculeRouterProvider } from '../index.js'

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

describe('MoleculeRouterProvider wiring (react-router)', () => {
  beforeEach(() => {
    bonded = null
    navigateFn.mockClear()
    vi.mocked(setRouter).mockClear()
  })

  it('bonds the adapter via setRouter on mount', () => {
    MoleculeRouterProvider({ children: 'app' } as never)

    expect(setRouter).toHaveBeenCalledTimes(1)
    const adapter = vi.mocked(setRouter).mock.calls[0][0]
    expect(adapter).toBeDefined()
    expect(adapter.navigate).toBeInstanceOf(Function)
  })

  it('core navigate() drives the real React Router navigate after mount', async () => {
    MoleculeRouterProvider({ children: 'app' } as never)

    // navigate() from @molecule/app-routing — NOT the react-router hook — must reach
    // the real React Router navigate through the bonded adapter.
    coreNavigate('/dashboard')
    await flush()

    expect(navigateFn).toHaveBeenCalledWith('/dashboard', { replace: false, state: undefined })
  })

  it('still invokes the optional onRouterReady callback with the bonded router', () => {
    const onRouterReady = vi.fn()
    MoleculeRouterProvider({ children: 'app', onRouterReady } as never)

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(vi.mocked(setRouter).mock.calls[0][0])
  })
})
