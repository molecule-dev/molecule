// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import type { Logger,LoggerProvider as LoggerProviderType } from '@molecule/app-logger'
import type { RouteLocation,Router } from '@molecule/app-routing'
import type { StateProvider as StateProviderType,Store } from '@molecule/app-state'
import type { StorageProvider as StorageProviderType } from '@molecule/app-storage'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'

import {
  useAuth,
  useHttp,
  useLogger,
  useRouter,
  useStorageValue,
  useStore,
  useTheme,
} from '../hooks/index.js'
import {
  AuthProvider,
  HttpProvider,
  LoggerProvider,
  RouterProvider,
  StateProvider,
  StorageProvider,
  ThemeProvider,
} from '../providers.js'

// Mock store
/**
 * Creates a mock store for testing.
 * @param initial - The initial state value.
 * @returns A mock store instance.
 */
function createMockStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState: (partial) => {
      const newState = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...newState }
      listeners.forEach((l) => l())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    destroy: () => listeners.clear(),
  }
}

// Mock state provider
/**
 * Creates a mock state provider for testing.
 * @returns A mock state provider instance.
 */
function createMockStateProvider(): StateProviderType {
  return {
    createStore: <T,>(config: { initialState: T }) => createMockStore(config.initialState),
  }
}

// Mock auth client
/**
 * Creates a mock auth client for testing.
 * @param user - The initial user value, or null for unauthenticated.
 * @returns A mock auth client instance.
 */
function createMockAuthClient<T>(user: T | null = null): AuthClient<T> {
  let currentUser = user
  let authenticated = user !== null
  const listeners = new Set<() => void>()

  const getState = (): AuthState<T> => ({
    initialized: true,
    authenticated,
    user: currentUser,
    loading: false,
    error: null,
  })

  return {
    getState,
    login: vi.fn().mockImplementation(async () => {
      currentUser = { id: '1', email: 'test@example.com' } as unknown as T
      authenticated = true
      listeners.forEach((l) => l())
      return {
        user: currentUser,
        tokens: { accessToken: 'token' },
        expiresAt: Date.now() + 3600000,
      }
    }),
    logout: vi.fn().mockImplementation(async () => {
      currentUser = null
      authenticated = false
      listeners.forEach((l) => l())
    }),
    register: vi.fn(),
    refresh: vi.fn(),
    onAuthChange: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getTokens: () => null,
    isTokenExpired: () => false,
  }
}

// Mock theme provider
/**
 * Creates a mock theme provider for testing.
 * @returns A mock theme provider instance.
 */
function createMockThemeProvider(): ThemeProviderType {
  let currentTheme = 'light'
  const listeners = new Set<() => void>()

  const lightTheme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }

  return {
    getTheme: () => lightTheme,
    getThemeName: () => currentTheme,
    getThemes: () => ['light', 'dark'],
    setTheme: (name) => {
      currentTheme = name
      listeners.forEach((l) => l())
    },
    onThemeChange: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

// Mock router
/**
 * Creates a mock router for testing.
 * @returns A mock router instance.
 */
function createMockRouter(): Router {
  let location: RouteLocation = {
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  }
  const listeners = new Set<() => void>()

  return {
    getLocation: () => location,
    getParams: () => ({}),
    getQuery: () => ({}),
    navigate: vi.fn().mockImplementation((path) => {
      location = { ...location, pathname: path }
      listeners.forEach((l) => l())
    }),
    navigateTo: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    setQuery: vi.fn(),
    setQueryParam: vi.fn(),
    setHash: vi.fn(),
    isActive: (path) => location.pathname === path,
    matchPath: vi.fn(),
    generatePath: vi.fn(),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    addGuard: vi.fn(),
    registerRoutes: vi.fn(),
    getRoutes: () => [],
    destroy: vi.fn(),
  }
}

// Mock HTTP client
/**
 * Creates a mock HTTP client for testing.
 * @returns A mock HTTP client instance.
 */
function createMockHttpClient(): HttpClient {
  return {
    get: vi
      .fn()
      .mockResolvedValue({
        data: { id: 1 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      }),
    post: vi
      .fn()
      .mockResolvedValue({
        data: { id: 1 },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {},
      }),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    setAuthToken: vi.fn(),
    getAuthToken: () => null,
    onAuthError: () => () => {},
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
  }
}

// Mock storage provider
/**
 * Creates a mock storage provider for testing.
 * @returns A mock storage provider instance.
 */
function createMockStorageProvider(): StorageProviderType {
  const storage = new Map<string, unknown>()

  return {
    get: async <T,>(key: string) => storage.get(key) as T | undefined,
    set: async <T,>(key: string, value: T) => {
      storage.set(key, value)
    },
    remove: async (key: string) => {
      storage.delete(key)
    },
    clear: async () => {
      storage.clear()
    },
    keys: async () => Array.from(storage.keys()),
  }
}

// Mock logger provider
/**
 * Creates a mock logger provider for testing.
 * @returns A mock logger provider instance.
 */
function createMockLoggerProvider(): LoggerProviderType {
  const mockLogger: Logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: () => 'info',
    child: () => mockLogger,
    withContext: () => mockLogger,
    addTransport: vi.fn(),
    removeTransport: vi.fn(),
  }

  return {
    getLogger: () => mockLogger,
    createLogger: () => mockLogger,
    setLevel: vi.fn(),
    getLevel: () => 'info',
    addTransport: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: () => true,
  }
}

describe('useStore', () => {
  it('should return current state from store', () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <StateProvider provider={stateProvider}>{children}</StateProvider>
    )

    const { result } = renderHook(() => useStore(store), { wrapper })

    expect(result.current).toEqual({ count: 0 })
  })

  it('should update when store state changes', () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <StateProvider provider={stateProvider}>{children}</StateProvider>
    )

    const { result } = renderHook(() => useStore(store), { wrapper })

    expect(result.current.count).toBe(0)

    act(() => {
      store.setState({ count: 5 })
    })

    expect(result.current.count).toBe(5)
  })

  it('should support selector option', () => {
    const store = createMockStore({ count: 10, name: 'test' })
    const stateProvider = createMockStateProvider()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <StateProvider provider={stateProvider}>{children}</StateProvider>
    )

    const { result } = renderHook(() => useStore(store, { selector: (s) => s.count * 2 }), {
      wrapper,
    })

    expect(result.current).toBe(20)
  })
})

describe('useAuth', () => {
  it('should return auth state', () => {
    const authClient = createMockAuthClient<{ id: string }>()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <AuthProvider client={authClient}>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('should login and update state', async () => {
    const authClient = createMockAuthClient<{ id: string; email: string }>()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <AuthProvider client={authClient}>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth<{ id: string; email: string }>(), { wrapper })

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' })
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('test@example.com')
  })
})

describe('useTheme', () => {
  it('should return current theme', () => {
    const themeProvider = createMockThemeProvider()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <ThemeProvider provider={themeProvider}>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.themeName).toBe('light')
    expect(result.current.mode).toBe('light')
  })

  it('should toggle theme', () => {
    const themeProvider = createMockThemeProvider()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <ThemeProvider provider={themeProvider}>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.themeName).toBe('dark')
  })
})

describe('useRouter', () => {
  it('should return current location', () => {
    const router = createMockRouter()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <RouterProvider router={router}>{children}</RouterProvider>
    )

    const { result } = renderHook(() => useRouter(), { wrapper })

    expect(result.current.location.pathname).toBe('/')
  })

  it('should navigate to new path', () => {
    const router = createMockRouter()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <RouterProvider router={router}>{children}</RouterProvider>
    )

    const { result } = renderHook(() => useRouter(), { wrapper })

    act(() => {
      result.current.navigate('/dashboard')
    })

    expect(result.current.location.pathname).toBe('/dashboard')
  })
})

describe('useHttp', () => {
  it('should make GET request', async () => {
    const httpClient = createMockHttpClient()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <HttpProvider client={httpClient}>{children}</HttpProvider>
    )

    const { result } = renderHook(() => useHttp<{ id: number }>('GET', '/api/test'), { wrapper })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.data).toEqual({ id: 1 })
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', expect.any(Object))
  })
})

describe('useStorageValue', () => {
  it('should load and set storage value', async () => {
    const storageProvider = createMockStorageProvider()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <StorageProvider provider={storageProvider}>{children}</StorageProvider>
    )

    const { result } = renderHook(
      () => useStorageValue<string>('theme', { defaultValue: 'light' }),
      { wrapper },
    )

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.value).toBe('light')

    await act(async () => {
      await result.current.setValue('dark')
    })

    expect(result.current.value).toBe('dark')
  })
})

describe('useLogger', () => {
  it('should return a logger instance', () => {
    const loggerProvider = createMockLoggerProvider()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <LoggerProvider provider={loggerProvider}>{children}</LoggerProvider>
    )

    const { result } = renderHook(() => useLogger('TestComponent'), { wrapper })

    expect(result.current).toBeDefined()
    expect(typeof result.current.info).toBe('function')

    result.current.info('test message')
    expect(loggerProvider.getLogger().info).toHaveBeenCalled()
  })
})

describe('Provider errors', () => {
  it('should throw when useStore is used outside StateProvider', () => {
    const store = createMockStore({ count: 0 })

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useStore(store))
    }).toThrow('useStateProvider must be used within a StateProvider')

    consoleSpy.mockRestore()
  })

  it('should throw when useAuth is used outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuthClient must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})
