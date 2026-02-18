/**
 * Tests for useRouter composable
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockInjectReturnValue: unknown = undefined
const onMountedCallbacks: Array<() => void> = []
const onUnmountedCallbacks: Array<() => void> = []

// Mock Vue
vi.mock('vue', () => ({
  inject: vi.fn(() => mockInjectReturnValue),
  ref: vi.fn((v: unknown) => ({ value: v })),
  computed: vi.fn((fn: () => unknown) => ({ value: fn() })),
  onMounted: vi.fn((cb: () => void) => {
    onMountedCallbacks.push(cb)
  }),
  onUnmounted: vi.fn((cb: () => void) => {
    onUnmountedCallbacks.push(cb)
  }),
}))

// Mock molecule packages
vi.mock('@molecule/app-state', () => ({}))
vi.mock('@molecule/app-auth', () => ({}))
vi.mock('@molecule/app-theme', () => ({}))
vi.mock('@molecule/app-routing', () => ({}))
vi.mock('@molecule/app-i18n', () => ({}))
vi.mock('@molecule/app-http', () => ({}))
vi.mock('@molecule/app-storage', () => ({}))
vi.mock('@molecule/app-logger', () => ({}))
vi.mock('@molecule/app-forms', () => ({}))
vi.mock('@molecule/app-ui', () => ({}))

import {
  useLocation,
  useNavigate,
  useParams,
  useQuery,
  useRouter,
  useRouterInstance,
} from '../composables/useRouter.js'

const mockLocation = { pathname: '/home', search: '', hash: '' }
const mockParams = { id: '123' }
const mockQuery = { page: '1' }

describe('useRouterInstance', () => {
  beforeEach(() => {
    mockInjectReturnValue = undefined
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
  })

  it('returns the injected router', () => {
    const mockRouter = { navigate: vi.fn() }
    mockInjectReturnValue = mockRouter
    const result = useRouterInstance()
    expect(result).toBe(mockRouter)
  })

  it('throws when router is not injected', () => {
    mockInjectReturnValue = undefined
    expect(() => useRouterInstance()).toThrow(
      'useRouterInstance requires RouterProvider to be provided',
    )
  })
})

describe('useRouter', () => {
  let mockRouter: {
    getLocation: ReturnType<typeof vi.fn>
    getParams: ReturnType<typeof vi.fn>
    getQuery: ReturnType<typeof vi.fn>
    navigate: ReturnType<typeof vi.fn>
    navigateTo: ReturnType<typeof vi.fn>
    back: ReturnType<typeof vi.fn>
    forward: ReturnType<typeof vi.fn>
    isActive: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
  }
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockUnsubscribe.mockClear()

    mockRouter = {
      getLocation: vi.fn(() => mockLocation),
      getParams: vi.fn(() => mockParams),
      getQuery: vi.fn(() => mockQuery),
      navigate: vi.fn(),
      navigateTo: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      isActive: vi.fn(() => true),
      subscribe: vi.fn(() => {
        return mockUnsubscribe
      }),
    }
    mockInjectReturnValue = mockRouter
  })

  it('returns location, params, query, navigate, navigateTo, back, forward, isActive', () => {
    const result = useRouter()
    expect(result.location).toBeDefined()
    expect(result.params).toBeDefined()
    expect(result.query).toBeDefined()
    expect(typeof result.navigate).toBe('function')
    expect(typeof result.navigateTo).toBe('function')
    expect(typeof result.back).toBe('function')
    expect(typeof result.forward).toBe('function')
    expect(typeof result.isActive).toBe('function')
  })

  it('computed location reflects initial value', () => {
    const result = useRouter()
    expect(result.location.value).toEqual(mockLocation)
  })

  it('computed params reflects initial value', () => {
    const result = useRouter()
    expect(result.params.value).toEqual(mockParams)
  })

  it('computed query reflects initial value', () => {
    const result = useRouter()
    expect(result.query.value).toEqual(mockQuery)
  })

  it('navigate delegates to router', () => {
    const result = useRouter()
    result.navigate('/about')
    expect(mockRouter.navigate).toHaveBeenCalledWith('/about', undefined)
  })

  it('navigate passes options through', () => {
    const result = useRouter()
    const options = { replace: true }
    result.navigate('/about', options)
    expect(mockRouter.navigate).toHaveBeenCalledWith('/about', options)
  })

  it('navigateTo delegates to router', () => {
    const result = useRouter()
    result.navigateTo('user', { id: '1' }, { tab: 'profile' })
    expect(mockRouter.navigateTo).toHaveBeenCalledWith(
      'user',
      { id: '1' },
      { tab: 'profile' },
      undefined,
    )
  })

  it('back delegates to router', () => {
    const result = useRouter()
    result.back()
    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('forward delegates to router', () => {
    const result = useRouter()
    result.forward()
    expect(mockRouter.forward).toHaveBeenCalled()
  })

  it('isActive delegates to router', () => {
    const result = useRouter()
    result.isActive('/home')
    expect(mockRouter.isActive).toHaveBeenCalledWith('/home', undefined)
  })

  it('isActive passes exact param through', () => {
    const result = useRouter()
    result.isActive('/home', true)
    expect(mockRouter.isActive).toHaveBeenCalledWith('/home', true)
  })

  it('subscribes on mount', () => {
    useRouter()
    expect(onMountedCallbacks.length).toBeGreaterThan(0)
    onMountedCallbacks[0]()
    expect(mockRouter.subscribe).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes on unmount', () => {
    useRouter()
    onMountedCallbacks[0]()
    expect(onUnmountedCallbacks.length).toBeGreaterThan(0)
    onUnmountedCallbacks[0]()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('handles unmount without prior mount', () => {
    useRouter()
    expect(onUnmountedCallbacks.length).toBeGreaterThan(0)
    expect(() => onUnmountedCallbacks[0]()).not.toThrow()
  })
})

describe('useLocation', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      getLocation: vi.fn(() => mockLocation),
      getParams: vi.fn(() => mockParams),
      getQuery: vi.fn(() => mockQuery),
      navigate: vi.fn(),
      navigateTo: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      isActive: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    }
  })

  it('returns the location computed ref', () => {
    const result = useLocation()
    expect(result.value).toEqual(mockLocation)
  })
})

describe('useParams', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      getLocation: vi.fn(() => mockLocation),
      getParams: vi.fn(() => mockParams),
      getQuery: vi.fn(() => mockQuery),
      navigate: vi.fn(),
      navigateTo: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      isActive: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    }
  })

  it('returns the params computed ref', () => {
    const result = useParams()
    expect(result.value).toEqual(mockParams)
  })
})

describe('useQuery', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      getLocation: vi.fn(() => mockLocation),
      getParams: vi.fn(() => mockParams),
      getQuery: vi.fn(() => mockQuery),
      navigate: vi.fn(),
      navigateTo: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      isActive: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    }
  })

  it('returns the query computed ref', () => {
    const result = useQuery()
    expect(result.value).toEqual(mockQuery)
  })
})

describe('useNavigate', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      getLocation: vi.fn(),
      getParams: vi.fn(),
      getQuery: vi.fn(),
      navigate: vi.fn(),
      navigateTo: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      isActive: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    }
  })

  it('returns a navigate function', () => {
    const result = useNavigate()
    expect(typeof result).toBe('function')
  })

  it('delegates to router.navigate', () => {
    const result = useNavigate()
    result('/dashboard')
    expect((mockInjectReturnValue as never).navigate).toHaveBeenCalledWith('/dashboard', undefined)
  })

  it('passes options to router.navigate', () => {
    const result = useNavigate()
    result('/dashboard', { replace: true })
    expect((mockInjectReturnValue as never).navigate).toHaveBeenCalledWith('/dashboard', {
      replace: true,
    })
  })
})
