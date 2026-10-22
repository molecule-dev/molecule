// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import type { Logger, LoggerProvider as LoggerProviderType } from '@molecule/app-logger'
import type { RouteLocation, Router } from '@molecule/app-routing'
import type { StateProvider as StateProviderType, Store } from '@molecule/app-state'
import type { StorageProvider as StorageProviderType } from '@molecule/app-storage'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'

import {
  useAuth,
  useHttp,
  type UseHttpResult,
  useLogger,
  useRouter,
  useStateProvider,
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
    status: authenticated ? 'authenticated' : 'unauthenticated',
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
    toggleMode: () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light'
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
    get: vi.fn().mockResolvedValue({
      data: { id: 1 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    }),
    post: vi.fn().mockResolvedValue({
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

  it('re-renders when only the status changes', () => {
    // xr-molecule-flash-m173's cache: the snapshot compared the user and the flags but not
    // `status`, so a session check that reported 'unavailable' with the SAME user kept rendering
    // the old status — a state change the hook silently dropped.
    let state: AuthState<{ id: string }> = {
      status: 'loading',
      initialized: true,
      authenticated: false,
      user: null,
      loading: false,
      error: null,
    }
    const listeners = new Set<() => void>()
    const authClient = {
      getState: () => state,
      onAuthChange: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refresh: vi.fn(),
    } as unknown as AuthClient<{ id: string }>

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <AuthProvider client={authClient}>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth<{ id: string }>(), { wrapper })
    expect(result.current.state.status).toBe('loading')
    // `status` is also exposed at the top level: it is the ONE value a route guard
    // or a page renders the session from, so it must not be reachable only through
    // `state` (xr-molecule-flash-m177 — a page gated its first paint on its own
    // current-user request instead of the client's status).
    expect(result.current.status).toBe('loading')

    act(() => {
      state = { ...state, status: 'unavailable' }
      listeners.forEach((listener) => listener())
    })

    expect(result.current.state.status).toBe('unavailable')
    expect(result.current.status).toBe('unavailable')
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

  it('should toggle theme via the provider toggleMode method', () => {
    const themeProvider = createMockThemeProvider()
    const toggleModeSpy = vi.spyOn(themeProvider, 'toggleMode')

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <ThemeProvider provider={themeProvider}>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.toggleTheme()
    })

    // `toggleTheme` must delegate to the provider's purpose-built
    // `toggleMode()` rather than index-cycling `getThemes()`.
    expect(toggleModeSpy).toHaveBeenCalledOnce()
    expect(result.current.themeName).toBe('dark')
  })

  it('falls back to cycling getThemes() when the provider has no toggleMode', () => {
    let currentTheme = 'light'
    const listeners = new Set<() => void>()
    // A non-conforming provider that predates `toggleMode` — `toggleTheme`
    // must still work by cycling the registered themes.
    const legacyProvider = {
      getTheme: () => createMockThemeProvider().getTheme(),
      getThemeName: () => currentTheme,
      getThemes: () => ['light', 'dark'],
      setTheme: (name: string) => {
        currentTheme = name
        listeners.forEach((l) => l())
      },
      onThemeChange: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    } as unknown as ThemeProviderType

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <ThemeProvider provider={legacyProvider}>{children}</ThemeProvider>
    )

    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.themeName).toBe('dark')
  })

  // A static site prerenders on a server that reads no storage and no OS
  // preference, then hydrates in a browser that reads both. The hook must
  // render the server's theme while hydrating — the markup it was sent — and
  // switch afterwards, or React logs a mismatch and (for text) throws the
  // server markup away.
  it('hydrates with the server theme, then switches to the live one, without a mismatch', async () => {
    const light = createMockThemeProvider().getTheme()
    const dark: Theme = { ...light, name: 'dark', mode: 'dark' }
    const serverProvider = {
      getTheme: () => light,
      getServerTheme: () => light,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
    } as unknown as ThemeProviderType
    const clientProvider = {
      getTheme: () => dark,
      getServerTheme: () => light,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
    } as unknown as ThemeProviderType
    const Mode = (): React.JSX.Element => {
      const { mode, themeName } = useTheme()
      return (
        <span data-mode={mode}>
          {mode}
          {themeName}
        </span>
      )
    }
    const html = renderToString(
      <ThemeProvider provider={serverProvider}>
        <Mode />
      </ThemeProvider>,
    )
    expect(html).toContain('data-mode="light"')
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(
        <ThemeProvider provider={clientProvider}>
          <Mode />
        </ThemeProvider>,
        { container, hydrate: true },
      )
      await waitFor(() =>
        expect(container.querySelector('span')?.getAttribute('data-mode')).toBe('dark'),
      )
      expect(container.querySelector('span')?.textContent).toBe('darkdark')
      expect(consoleError).not.toHaveBeenCalled()
    } finally {
      consoleError.mockRestore()
      container.remove()
    }
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
  it('publishes committed options before a child layout effect calls the action', async () => {
    const httpClient = createMockHttpClient()
    function Child({
      execute,
      token,
    }: {
      execute: () => Promise<unknown>
      token: string
    }): React.JSX.Element {
      React.useLayoutEffect(() => {
        void execute()
      }, [execute, token])
      return <span>{token}</span>
    }
    function Parent({ token }: { token: string }): React.JSX.Element {
      const { execute } = useHttp('GET', '/api/test', { headers: { 'X-Selection': token } })
      return <Child execute={execute} token={token} />
    }
    const { rerender } = render(
      <HttpProvider client={httpClient}>
        <Parent token="first" />
      </HttpProvider>,
    )
    await act(async () => {})
    vi.mocked(httpClient.get).mockClear()
    rerender(
      <HttpProvider client={httpClient}>
        <Parent token="second" />
      </HttpProvider>,
    )
    await act(async () => {})
    expect(httpClient.get).toHaveBeenCalledOnce()
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', {
      headers: { 'X-Selection': 'second' },
    })
  })

  it('keeps a committed action on committed options while a new render suspends', async () => {
    const httpClient = createMockHttpClient()
    const pending = new Promise<void>(() => {})
    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <HttpProvider client={httpClient}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </HttpProvider>
    )
    const { result, rerender } = renderHook(
      ({ token, suspend }) => {
        const request = useHttp('GET', '/api/test', { headers: { 'X-Selection': token } })
        if (suspend) throw pending
        return request
      },
      { initialProps: { token: 'committed', suspend: false }, wrapper },
    )
    const execute = result.current.execute
    act(() => {
      React.startTransition(() => rerender({ token: 'pending', suspend: true }))
    })
    await act(async () => {
      await execute()
    })
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', {
      headers: { 'X-Selection': 'committed' },
    })
  })

  it('keeps execute stable across ordinary rerenders', () => {
    const httpClient = createMockHttpClient()
    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <HttpProvider client={httpClient}>{children}</HttpProvider>
    )
    const { result, rerender } = renderHook(() => useHttp('GET', '/api/test'), { wrapper })
    const execute = result.current.execute
    rerender()
    expect(result.current.execute).toBe(execute)
  })

  it('keeps execute stable through its own state updates and inline options', async () => {
    const httpClient = createMockHttpClient()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <HttpProvider client={httpClient}>{children}</HttpProvider>
    )

    const { result, rerender } = renderHook(
      ({ nonce }: { nonce: number }) =>
        useHttp<{ id: number }>('GET', '/api/test', {
          // Rebuilt on every render, like an inline config in a component.
          headers: { 'X-Nonce': String(nonce) },
          onSuccess: () => {},
        }),
      { wrapper, initialProps: { nonce: 0 } },
    )

    const execute = result.current.execute

    // The hook's own loading → data updates rerender it.
    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.data).toEqual({ id: 1 })
    expect(result.current.execute).toBe(execute)

    // An ordinary parent rerender must not replace the action either.
    rerender({ nonce: 1 })
    expect(result.current.execute).toBe(execute)
  })

  it('runs exactly one request from an effect that depends on execute', async () => {
    const httpClient = createMockHttpClient()
    const successes: string[] = []

    function Consumer(): React.JSX.Element {
      const attempts = React.useRef(0)
      const { data, loading, execute } = useHttp<{ id: number }>('GET', '/api/test', {
        onSuccess: () => {
          successes.push('success')
        },
      })

      React.useEffect(() => {
        // Bounded fixture: an effect that re-fires because `execute` changed must
        // FAIL the call-count assertion, never spin the runner.
        if (attempts.current >= 3) return
        attempts.current += 1
        void execute()
      }, [execute])

      return <p>{loading ? 'loading' : `id:${data?.id ?? 'none'}`}</p>
    }

    const { container, rerender } = render(
      <HttpProvider client={httpClient}>
        <Consumer />
      </HttpProvider>,
    )

    await waitFor(() => expect(container.textContent).toBe('id:1'))

    // A parent rerender after the request settled must not re-run the effect.
    rerender(
      <HttpProvider client={httpClient}>
        <Consumer />
      </HttpProvider>,
    )
    // Let any pending effect→request→state chain reach its bound before asserting.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(httpClient.get).toHaveBeenCalledTimes(1)
    expect(successes).toEqual(['success'])
    expect(container.textContent).toBe('id:1')
  })

  it('sends the current options and callback on a later manual call', async () => {
    const httpClient = createMockHttpClient()
    const firstSuccess = vi.fn()
    const secondSuccess = vi.fn()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <HttpProvider client={httpClient}>{children}</HttpProvider>
    )

    const { result, rerender } = renderHook(
      ({ version, onSuccess }: { version: string; onSuccess: (data: { id: number }) => void }) =>
        useHttp<{ id: number }>('POST', '/api/items', {
          headers: { 'X-Version': version },
          data: { name: 'widget' },
          onSuccess,
        }),
      { wrapper, initialProps: { version: 'one', onSuccess: firstSuccess } },
    )

    const execute = result.current.execute

    rerender({ version: 'two', onSuccess: secondSuccess })
    // Options do not churn the action; the call below still sends the latest ones.
    expect(result.current.execute).toBe(execute)

    await act(async () => {
      await result.current.execute()
    })

    expect(httpClient.post).toHaveBeenCalledTimes(1)
    expect(httpClient.post).toHaveBeenCalledWith(
      '/api/items',
      { name: 'widget' },
      expect.objectContaining({ headers: { 'X-Version': 'two' } }),
    )
    expect(firstSuccess).not.toHaveBeenCalled()
    expect(secondSuccess).toHaveBeenCalledWith({ id: 1 })
  })

  it('selects the new URL, method and client when they change', async () => {
    const firstClient = createMockHttpClient()
    const secondClient = createMockHttpClient()
    const seen: { current: UseHttpResult<{ id: number }> | null } = { current: null }

    function Probe({
      method,
      url,
    }: {
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      url: string
    }): null {
      seen.current = useHttp<{ id: number }>(method, url)
      return null
    }

    const { rerender } = render(
      <HttpProvider client={firstClient}>
        <Probe method="GET" url="/api/one" />
      </HttpProvider>,
    )

    await act(async () => {
      await seen.current?.execute()
    })
    expect(firstClient.get).toHaveBeenCalledWith('/api/one', expect.any(Object))

    rerender(
      <HttpProvider client={secondClient}>
        <Probe method="DELETE" url="/api/two" />
      </HttpProvider>,
    )

    await act(async () => {
      await seen.current?.execute()
    })
    expect(secondClient.delete).toHaveBeenCalledWith('/api/two', expect.any(Object))
    expect(secondClient.get).not.toHaveBeenCalled()
    expect(firstClient.get).toHaveBeenCalledTimes(1)
    expect(firstClient.delete).not.toHaveBeenCalled()
  })

  it('reports a failure through state and onError', async () => {
    const httpClient = createMockHttpClient()
    vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('nope'))
    const onError = vi.fn()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <HttpProvider client={httpClient}>{children}</HttpProvider>
    )

    const { result } = renderHook(() => useHttp('GET', '/api/test', { onError }), { wrapper })

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error?.message).toBe('nope')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('does not deliver a response to an unmounted hook', async () => {
    const httpClient = createMockHttpClient()
    const onSuccess = vi.fn()
    let resolveRequest: ((response: HttpResponse<{ id: number }>) => void) | undefined
    vi.mocked(httpClient.get).mockReturnValueOnce(
      new Promise<HttpResponse<{ id: number }>>((resolve) => {
        resolveRequest = resolve
      }),
    )

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <HttpProvider client={httpClient}>{children}</HttpProvider>
    )

    const { result, unmount } = renderHook(
      () => useHttp<{ id: number }>('GET', '/api/test', { onSuccess }),
      { wrapper },
    )

    let pending: Promise<{ id: number } | null> | undefined
    act(() => {
      pending = result.current.execute()
    })
    unmount()

    await act(async () => {
      resolveRequest?.({
        data: { id: 7 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { method: 'GET', url: '/api/test' },
      })
      await pending
    })

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('resets state without replacing execute', async () => {
    const httpClient = createMockHttpClient()

    const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
      <HttpProvider client={httpClient}>{children}</HttpProvider>
    )

    const { result } = renderHook(() => useHttp<{ id: number }>('GET', '/api/test'), { wrapper })
    const execute = result.current.execute

    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.data).toEqual({ id: 1 })

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.execute).toBe(execute)
  })

  it('stays finite when StrictMode runs the consumer effect twice', async () => {
    const httpClient = createMockHttpClient()

    function Consumer(): React.JSX.Element {
      const attempts = React.useRef(0)
      const { data, execute } = useHttp<{ id: number }>('GET', '/api/test')

      React.useEffect(() => {
        // StrictMode runs a mount effect twice; a THIRD run means execute was
        // replaced. The cap keeps that regression a failed assertion, not a spin.
        if (attempts.current >= 3) return
        attempts.current += 1
        void execute()
      }, [execute])

      return <p>{data ? `id:${data.id}` : 'id:none'}</p>
    }

    const { container } = render(
      <React.StrictMode>
        <HttpProvider client={httpClient}>
          <Consumer />
        </HttpProvider>
      </React.StrictMode>,
    )

    await waitFor(() => expect(container.textContent).toBe('id:1'))

    // Let any pending effect→request→state chain reach its bound before asserting.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Two mount effects in StrictMode, never a chain of them.
    expect(vi.mocked(httpClient.get).mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(vi.mocked(httpClient.get).mock.calls.length).toBeLessThanOrEqual(2)
  })

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
  // The hook is HANDED its store, so it must work with no provider at all
  // (X1 flash-m100): an app that made its store with a provider package's own
  // `createStoreWithActions()` — never calling `setProvider()` — had every page
  // throw "useStateProvider must be used within a StateProvider" on mount, from
  // a hook that only ever calls `store.getState()` / `store.subscribe()`.
  it('should render useStore(store) with no StateProvider anywhere', () => {
    const store = createMockStore({ count: 0 })

    const { result } = renderHook(() => useStore(store, { selector: (s) => s.count }))

    expect(result.current).toBe(0)

    act(() => store.setState({ count: 1 }))
    expect(result.current).toBe(1)
  })

  it('should name the fix when useStateProvider is used outside StateProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let thrown: Error | undefined
    try {
      renderHook(() => useStateProvider())
    } catch (error) {
      thrown = error as Error
    }

    expect(thrown?.message).toContain('useStateProvider must be used within a StateProvider')
    // The message has to carry the fix, not just the diagnosis: the import line,
    // the bond that supplies the provider by default, and the hook to reach for
    // when the caller already holds a store.
    expect(thrown?.message).toContain(
      "import { MoleculeProvider, StateProvider } from '@molecule/app-react'",
    )
    expect(thrown?.message).toContain('setupAllDefaultBonds()')
    expect(thrown?.message).toContain('useStore(store)')

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
