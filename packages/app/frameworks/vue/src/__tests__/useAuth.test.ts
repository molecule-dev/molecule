/**
 * Tests for useAuth composable
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockInjectReturnValue: unknown = undefined
const onMountedCallbacks: Array<() => void> = []
const onUnmountedCallbacks: Array<() => void> = []

// Mock Vue
vi.mock('vue', () => ({
  inject: vi.fn(() => mockInjectReturnValue),
  ref: vi.fn((v: unknown) => ({ value: v })),
  shallowRef: vi.fn((v: unknown) => ({ value: v })),
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

import { useAuth, useAuthClient, useIsAuthenticated, useUser } from '../composables/useAuth.js'

describe('useAuthClient', () => {
  beforeEach(() => {
    mockInjectReturnValue = undefined
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
  })

  it('returns the injected auth client', () => {
    const mockClient = { login: vi.fn(), logout: vi.fn() }
    mockInjectReturnValue = mockClient
    const result = useAuthClient()
    expect(result).toBe(mockClient)
  })

  it('throws when auth client is not injected', () => {
    mockInjectReturnValue = undefined
    expect(() => useAuthClient()).toThrow('useAuthClient requires AuthProvider to be provided')
  })
})

describe('useAuth', () => {
  let mockClient: {
    getState: ReturnType<typeof vi.fn>
    onAuthChange: ReturnType<typeof vi.fn>
    login: ReturnType<typeof vi.fn>
    logout: ReturnType<typeof vi.fn>
    register: ReturnType<typeof vi.fn>
    refresh: ReturnType<typeof vi.fn>
  }
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockUnsubscribe.mockClear()

    mockClient = {
      getState: vi.fn(() => ({
        user: { id: '1', name: 'Test User' },
        authenticated: true,
        loading: false,
      })),
      onAuthChange: vi.fn(() => {
        return mockUnsubscribe
      }),
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refresh: vi.fn(),
    }
    mockInjectReturnValue = mockClient
  })

  it('returns auth state, user, isAuthenticated, isLoading', () => {
    const result = useAuth()
    expect(result.state).toBeDefined()
    expect(result.user).toBeDefined()
    expect(result.isAuthenticated).toBeDefined()
    expect(result.isLoading).toBeDefined()
  })

  it('returns login, logout, register, refresh functions', () => {
    const result = useAuth()
    expect(typeof result.login).toBe('function')
    expect(typeof result.logout).toBe('function')
    expect(typeof result.register).toBe('function')
    expect(typeof result.refresh).toBe('function')
  })

  it('login delegates to auth client', () => {
    const result = useAuth()
    const creds = { email: 'test@test.com', password: 'pass' }
    result.login(creds)
    expect(mockClient.login).toHaveBeenCalledWith(creds)
  })

  it('logout delegates to auth client', () => {
    const result = useAuth()
    result.logout()
    expect(mockClient.logout).toHaveBeenCalled()
  })

  it('register delegates to auth client', () => {
    const result = useAuth()
    const data = { email: 'test@test.com', password: 'pass' }
    result.register(data)
    expect(mockClient.register).toHaveBeenCalledWith(data)
  })

  it('refresh delegates to auth client', () => {
    const result = useAuth()
    result.refresh()
    expect(mockClient.refresh).toHaveBeenCalled()
  })

  it('subscribes to auth changes on mount', () => {
    useAuth()
    expect(onMountedCallbacks.length).toBeGreaterThan(0)

    // Simulate mount
    onMountedCallbacks[0]()
    expect(mockClient.onAuthChange).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes on unmount', () => {
    useAuth()

    // Simulate mount
    onMountedCallbacks[0]()

    // Simulate unmount
    expect(onUnmountedCallbacks.length).toBeGreaterThan(0)
    onUnmountedCallbacks[0]()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('handles unmount without prior mount (no unsubscribe set)', () => {
    useAuth()
    // Simulate unmount without mount - should not throw
    expect(onUnmountedCallbacks.length).toBeGreaterThan(0)
    expect(() => onUnmountedCallbacks[0]()).not.toThrow()
  })

  it('computed user reflects initial state', () => {
    const result = useAuth()
    expect(result.user.value).toEqual({ id: '1', name: 'Test User' })
  })

  it('computed isAuthenticated reflects initial state', () => {
    const result = useAuth()
    expect(result.isAuthenticated.value).toBe(true)
  })

  it('computed isLoading reflects initial state', () => {
    const result = useAuth()
    expect(result.isLoading.value).toBe(false)
  })
})

describe('useUser', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0

    mockInjectReturnValue = {
      getState: vi.fn(() => ({
        user: { id: '1', name: 'Test' },
        authenticated: true,
        loading: false,
      })),
      onAuthChange: vi.fn(() => vi.fn()),
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refresh: vi.fn(),
    }
  })

  it('returns the user computed ref', () => {
    const result = useUser()
    expect(result.value).toEqual({ id: '1', name: 'Test' })
  })
})

describe('useIsAuthenticated', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0

    mockInjectReturnValue = {
      getState: vi.fn(() => ({
        user: null,
        authenticated: false,
        loading: false,
      })),
      onAuthChange: vi.fn(() => vi.fn()),
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refresh: vi.fn(),
    }
  })

  it('returns the isAuthenticated computed ref', () => {
    const result = useIsAuthenticated()
    expect(result.value).toBe(false)
  })
})
