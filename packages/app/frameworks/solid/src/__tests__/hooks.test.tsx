// @vitest-environment jsdom

/**
 * The Solid counterparts of React's `hooks.test.tsx`: one case per React test,
 * under the same title, asserting what a caller of the same primitive observes.
 *
 * Solid has no commits and no rerenders, so a React case is translated to the
 * framework-neutral fact it pins:
 *
 * - a value read after a change is the changed one (React: the first commit);
 * - an action keeps one identity while its inputs do not change (React: the
 *   stable `useCallback`);
 * - an effect argument that changed re-runs the caller's effect (React: the
 *   dependency array), through a signal read inside that effect;
 * - a StrictMode double invocation of a mount effect is reproduced by running
 *   the same mount-effect body a second time on the same mount, which is what a
 *   caller can observe of it.
 *
 * @module
 */

import {
  type Accessor,
  batch,
  createEffect,
  createResource,
  createSignal,
  type JSX,
  on,
  Show,
  startTransition,
  Suspense,
} from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { AuthClient, AuthSessionSeed, AuthState, LoginCredentials } from '@molecule/app-auth'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import type { RouteChangeListener, RouteLocation, RouteParams, Router } from '@molecule/app-routing'
import type { StateListener, StateProvider, Store, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import { darkTheme, lightTheme, type Theme, type ThemeProvider } from '@molecule/app-theme'

import {
  AuthContext,
  HttpContext,
  LoggerContext,
  RouterContext,
  StateContext,
  StorageContext,
  ThemeContext,
} from '../context.js'
import { useAuth, type UseAuthResult } from '../primitives/auth.js'
import { useHttp, type UseHttpResult } from '../primitives/http.js'
import { useLogger } from '../primitives/logger.js'
import { useRouter } from '../primitives/router.js'
import { useStateProvider, useStore } from '../primitives/state.js'
import { useStorageValue } from '../primitives/storage.js'
import { useTheme } from '../primitives/theme.js'

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into a container in the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container the tree rendered into, and its unmount.
 */
function mountWithCleanup(app: () => JSX.Element): { container: HTMLElement; unmount: () => void } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  let mounted = true
  const unmount = (): void => {
    if (!mounted) return
    mounted = false
    dispose()
    container.remove()
  }
  disposers.push(unmount)
  return { container, unmount }
}

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container it rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  return mountWithCleanup(app).container
}

/**
 * Runs a render that is expected to throw, cleaning up after it.
 *
 * @param app - The tree to render.
 * @returns The thrown error.
 */
function mountExpectingThrow(app: () => JSX.Element): Error {
  const container = document.createElement('div')
  document.body.appendChild(container)
  try {
    render(app, container)
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error))
  } finally {
    container.remove()
  }
  return new Error('the render did not throw')
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Retries an assertion until it passes or the deadline expires.
 *
 * @param assertion - The assertion to retry.
 * @param timeoutMs - How long to keep retrying.
 * @returns A promise resolved once the assertion passes.
 */
async function waitFor(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      assertion()
      return
    } catch (error) {
      if (Date.now() > deadline) throw error
      await settle()
    }
  }
}

/**
 * Wraps a `vi.fn` so a mock property carries its method's real generic
 * signature without a cast.
 *
 * @param mock - The recording mock.
 * @returns The same mock, typed as the interface method it stands in for.
 */
const asMethod = <Method extends (...args: never[]) => unknown>(
  mock: Mock<Method>,
): Mock<Method> & Method =>
  Object.assign(mock, (): never => {
    throw new Error('generic method stand-in — calls are recorded by the vi.fn mock')
  })

/**
 * Creates a mock store for testing.
 *
 * @param initial - The initial state value.
 * @returns A mock store instance.
 */
function createMockStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<StateListener<T>>()

  return {
    getState: () => state,
    setState: (partial) => {
      const previous = state
      const newState = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...newState }
      listeners.forEach((listener) => listener(state, previous))
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    destroy: () => listeners.clear(),
  }
}

/**
 * Creates a mock state provider for testing.
 *
 * @returns A mock state provider instance.
 */
function createMockStateProvider(): StateProvider {
  return {
    createStore: <T,>(config: StoreConfig<T>) => createMockStore(config.initialState),
  }
}

/**
 * An unauthenticated session snapshot.
 *
 * @returns The state.
 */
function anonymousState<T>(): AuthState<T> {
  return {
    status: 'unauthenticated',
    initialized: true,
    authenticated: false,
    user: null,
    loading: false,
    error: null,
  }
}

/**
 * A typed auth client whose session the test can publish, for React's
 * hand-written auth client fixtures.
 *
 * @param initial - The state the client starts in.
 * @param loginUser - The user a successful login publishes.
 * @returns The client and a publish function that notifies its listeners.
 */
function createAuthFixture<T extends { id: string }>(
  initial: AuthState<T>,
  loginUser: T,
): { client: AuthClient<T>; publish: (next: AuthState<T>) => void } {
  let state = initial
  const listeners = new Set<(next: AuthState<T>) => void>()
  const notify = (): void => {
    listeners.forEach((listener) => listener(state))
  }
  const publish = (next: AuthState<T>): void => {
    state = next
    notify()
  }

  const client: AuthClient<T> = {
    getState: () => state,
    isAuthenticated: () => state.authenticated,
    getUser: () => state.user,
    setUser: vi.fn((user: T | null) => {
      publish({ ...state, user, authenticated: user !== null })
    }),
    getAccessToken: () => (state.authenticated ? 'mock-access-token' : null),
    setAccessToken: vi.fn(),
    setSession: vi.fn((session: AuthSessionSeed<T>) => {
      publish({
        status: 'authenticated',
        initialized: true,
        authenticated: true,
        user: session.user,
        loading: false,
        error: null,
      })
    }),
    getRefreshToken: () => (state.authenticated ? 'mock-refresh-token' : null),
    login: vi.fn(async (_credentials: LoginCredentials) => {
      publish({
        status: 'authenticated',
        initialized: true,
        authenticated: true,
        user: loginUser,
        loading: false,
        error: null,
      })
      return { user: loginUser, accessToken: 'token', expiresAt: Date.now() + 3_600_000 }
    }),
    logout: vi.fn(async () => {
      publish(anonymousState<T>())
    }),
    register: vi.fn(),
    refresh: vi.fn(),
    requestPasswordReset: vi.fn(async () => {}),
    confirmPasswordReset: vi.fn(async () => {}),
    updateProfile: vi.fn(),
    changePassword: vi.fn(async () => {}),
    initialize: vi.fn(async () => {}),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    onAuthChange: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    addEventListener: vi.fn(() => () => {}),
    destroy: vi.fn(),
    getToken: () => null,
  }

  return { client, publish }
}

/**
 * Creates a mock auth client for testing, starting signed out.
 *
 * @param loginUser - The user a successful login publishes.
 * @returns A mock auth client instance.
 */
function createMockAuthClient<T extends { id: string }>(loginUser: T): AuthClient<T> {
  return createAuthFixture<T>(anonymousState<T>(), loginUser).client
}

/**
 * Creates a mock theme provider for testing.
 *
 * @returns A mock theme provider instance.
 */
function createMockThemeProvider(): ThemeProvider {
  let currentTheme: Theme = lightTheme
  const listeners = new Set<(theme: Theme) => void>()

  return {
    getTheme: () => currentTheme,
    setTheme: (theme) => {
      currentTheme = typeof theme === 'string' ? (theme === 'dark' ? darkTheme : lightTheme) : theme
      listeners.forEach((listener) => listener(currentTheme))
    },
    toggleMode: () => {
      currentTheme = currentTheme.mode === 'light' ? darkTheme : lightTheme
      listeners.forEach((listener) => listener(currentTheme))
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getThemes: () => [lightTheme, darkTheme],
  }
}

/**
 * Creates a mock router for testing.
 *
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
  const params: RouteParams = {}
  const query: Record<string, string> = {}
  const listeners = new Set<RouteChangeListener>()
  const notify = (action: 'push' | 'replace' | 'pop'): void => {
    listeners.forEach((listener) => listener(location, action))
  }

  return {
    getLocation: () => location,
    getParams: <T extends RouteParams = RouteParams>(): T => params as T,
    getQuery: () => query,
    getQueryParam: (key) => query[key],
    getHash: () => location.hash,
    navigate: vi.fn((path: string) => {
      location = { ...location, pathname: path }
      notify('push')
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
    createHref: vi.fn((path: string) => path),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    addGuard: vi.fn(),
    registerRoutes: vi.fn(),
    getRoutes: () => [],
    destroy: vi.fn(),
  }
}

/**
 * A full `HttpResponse<T>` fixture.
 *
 * @param data - The response body.
 * @returns The response.
 */
function httpResponse<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '/api/test' },
  }
}

/**
 * Creates a mock HTTP client for testing.
 *
 * @returns A mock HTTP client instance.
 */
function createMockHttpClient(): HttpClient {
  const get = asMethod(vi.fn<HttpClient['get']>())
  get.mockResolvedValue(httpResponse({ id: 1 }))
  const post = asMethod(vi.fn<HttpClient['post']>())
  post.mockResolvedValue({ ...httpResponse({ id: 1 }), status: 201, statusText: 'Created' })

  return {
    baseURL: '',
    defaultHeaders: {},
    get,
    post,
    put: asMethod(vi.fn<HttpClient['put']>()),
    patch: asMethod(vi.fn<HttpClient['patch']>()),
    delete: asMethod(vi.fn<HttpClient['delete']>()),
    request: asMethod(vi.fn<HttpClient['request']>()),
    setAuthToken: vi.fn(),
    getAuthToken: () => null,
    onAuthError: () => () => {},
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
  }
}

/**
 * Creates a mock storage provider for testing.
 *
 * @returns A mock storage provider instance.
 */
function createMockStorageProvider(): StorageProvider {
  const storage = new Map<string, unknown>()

  return {
    get: async <T,>(key: string) => (storage.get(key) as T | undefined) ?? null,
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

/**
 * Creates a mock logger provider for testing.
 *
 * @returns A mock logger provider instance.
 */
function createMockLoggerProvider(): LoggerProvider {
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
    addTransport: vi.fn(() => () => {}),
    removeTransport: vi.fn(),
  }

  return {
    getLogger: vi.fn(() => mockLogger),
    createLogger: vi.fn(() => mockLogger),
    setLevel: vi.fn(),
    getLevel: () => 'info',
    addTransport: vi.fn(() => () => {}),
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: () => true,
  }
}

/**
 * A GET whose answers the test releases by hand, in any order.
 *
 * @returns The client, and the answer/fail helpers that settle a held request.
 */
function heldGets(): {
  client: HttpClient
  answer: (index: number, data: unknown) => Promise<void>
  fail: (index: number, error: Error) => Promise<void>
} {
  const client = createMockHttpClient()
  const pending: Array<{
    resolve: (value: HttpResponse<unknown>) => void
    reject: (error: Error) => void
  }> = []
  vi.mocked(client.get).mockImplementation(
    <T,>(_url: string, _config?: RequestConfig) =>
      new Promise<HttpResponse<T>>((resolve, reject) => {
        pending.push({
          resolve: (value) => resolve(value as HttpResponse<T>),
          reject,
        })
      }),
  )
  return {
    client,
    answer: async (index, data) => {
      pending[index].resolve({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { method: 'GET', url: '/api/tags' },
      })
      await settle()
    },
    fail: async (index, error) => {
      pending[index].reject(error)
      await settle()
    },
  }
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

describe('useStore', () => {
  it('should return current state from store', () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()

    let result!: Accessor<{ count: number }>
    function Probe(): JSX.Element {
      result = useStore(store)
      return <></>
    }

    mount(() => (
      <StateContext.Provider value={stateProvider}>
        <Probe />
      </StateContext.Provider>
    ))

    expect(result()).toEqual({ count: 0 })
  })

  it('should update when store state changes', async () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()

    let result!: Accessor<{ count: number }>
    function Probe(): JSX.Element {
      result = useStore(store)
      return <></>
    }

    mount(() => (
      <StateContext.Provider value={stateProvider}>
        <Probe />
      </StateContext.Provider>
    ))

    expect(result().count).toBe(0)

    store.setState({ count: 5 })
    await settle()

    expect(result().count).toBe(5)
  })

  it('should support selector option', () => {
    const store = createMockStore({ count: 10, name: 'test' })
    const stateProvider = createMockStateProvider()

    let result!: Accessor<number>
    function Probe(): JSX.Element {
      result = useStore(store, { selector: (state) => state.count * 2 })
      return <></>
    }

    mount(() => (
      <StateContext.Provider value={stateProvider}>
        <Probe />
      </StateContext.Provider>
    ))

    expect(result()).toBe(20)
  })
})

describe('useAuth', () => {
  it('should return auth state', () => {
    const authClient = createMockAuthClient<{ id: string }>({ id: '1' })

    let result!: UseAuthResult<{ id: string }>
    function Probe(): JSX.Element {
      result = useAuth<{ id: string }>()
      return <></>
    }

    mount(() => (
      <AuthContext.Provider value={authClient}>
        <Probe />
      </AuthContext.Provider>
    ))

    expect(result.isAuthenticated()).toBe(false)
    expect(result.user()).toBeNull()
  })

  it('should login and update state', async () => {
    const authClient = createMockAuthClient<{ id: string; email: string }>({
      id: '1',
      email: 'test@example.com',
    })

    let result!: UseAuthResult<{ id: string; email: string }>
    function Probe(): JSX.Element {
      result = useAuth<{ id: string; email: string }>()
      return <></>
    }

    mount(() => (
      <AuthContext.Provider value={authClient}>
        <Probe />
      </AuthContext.Provider>
    ))

    await result.login({ email: 'test@example.com', password: 'password' })

    expect(result.isAuthenticated()).toBe(true)
    expect(result.user()?.email).toBe('test@example.com')
  })

  it('re-renders when only the status changes', () => {
    // xr-molecule-flash-m173's cache: the snapshot compared the user and the flags but not
    // `status`, so a session check that reported 'unavailable' with the SAME user kept
    // showing the old status — a state change the primitive silently dropped. The Solid
    // form of that cache is the subscription: every published state must reach `status()`.
    const { client: authClient, publish } = createAuthFixture<{ id: string }>(
      {
        status: 'loading',
        initialized: true,
        authenticated: false,
        user: null,
        loading: false,
        error: null,
      },
      { id: '1' },
    )

    let result!: UseAuthResult<{ id: string }>
    function Probe(): JSX.Element {
      result = useAuth<{ id: string }>()
      return <></>
    }

    mount(() => (
      <AuthContext.Provider value={authClient}>
        <Probe />
      </AuthContext.Provider>
    ))
    expect(result.state().status).toBe('loading')
    // `status` is also exposed at the top level: it is the ONE value a route guard
    // or a page renders the session from, so it must not be reachable only through
    // `state`.
    expect(result.status()).toBe('loading')

    publish({ ...authClient.getState(), status: 'unavailable' })

    expect(result.state().status).toBe('unavailable')
    expect(result.status()).toBe('unavailable')
  })
})

describe('useTheme', () => {
  it('should return current theme', () => {
    const themeProvider = createMockThemeProvider()

    let result!: ReturnType<typeof useTheme>
    function Probe(): JSX.Element {
      result = useTheme()
      return <></>
    }

    mount(() => (
      <ThemeContext.Provider value={themeProvider}>
        <Probe />
      </ThemeContext.Provider>
    ))

    expect(result.themeName()).toBe('light')
    expect(result.mode()).toBe('light')
  })

  it('should toggle theme via the provider toggleMode method', () => {
    const themeProvider = createMockThemeProvider()
    const toggleModeSpy = vi.spyOn(themeProvider, 'toggleMode')

    let result!: ReturnType<typeof useTheme>
    function Probe(): JSX.Element {
      result = useTheme()
      return <></>
    }

    mount(() => (
      <ThemeContext.Provider value={themeProvider}>
        <Probe />
      </ThemeContext.Provider>
    ))

    result.toggleTheme()

    // `toggleTheme` must delegate to the provider's purpose-built
    // `toggleMode()` rather than index-cycling `getThemes()`.
    expect(toggleModeSpy).toHaveBeenCalledOnce()
    expect(result.themeName()).toBe('dark')
  })

  it('falls back to cycling getThemes() when the provider has no toggleMode', () => {
    let currentTheme: Theme = lightTheme
    const listeners = new Set<(theme: Theme) => void>()
    const setTheme = vi.fn((theme: Theme | string) => {
      currentTheme = typeof theme === 'string' ? (theme === 'dark' ? darkTheme : lightTheme) : theme
      listeners.forEach((listener) => listener(currentTheme))
    })
    // A non-conforming provider that predates `toggleMode` — `toggleTheme`
    // must still work by cycling the registered themes. The method is removed
    // from a complete provider so the runtime shape is the legacy one the
    // fallback exists for.
    const legacyProvider: ThemeProvider = {
      getTheme: () => currentTheme,
      setTheme,
      toggleMode: vi.fn(),
      subscribe: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      getThemes: () => [lightTheme, darkTheme],
    }
    Reflect.deleteProperty(legacyProvider, 'toggleMode')

    let result!: ReturnType<typeof useTheme>
    function Probe(): JSX.Element {
      result = useTheme()
      return <></>
    }

    mount(() => (
      <ThemeContext.Provider value={legacyProvider}>
        <Probe />
      </ThemeContext.Provider>
    ))

    result.toggleTheme()

    expect(setTheme).toHaveBeenCalledWith('dark')
    expect(result.themeName()).toBe('dark')
  })

  // A static site prerenders on a server that reads no storage and no OS
  // preference, then hydrates in a browser that reads both. React's hook reads
  // the server snapshot while hydrating; Solid has no hydration snapshot (its
  // hydration reuses the server's markup and the provider supplies the first
  // read), so what a caller observes is ported: the theme shown before the
  // client goes live is the server's, it switches to the live one afterwards,
  // and nothing logs a mismatch.
  it('hydrates with the server theme, then switches to the live one, without a mismatch', async () => {
    const light = lightTheme
    const dark: Theme = { ...light, name: 'dark', mode: 'dark' }
    const live = { current: false }
    const listeners = new Set<(theme: Theme) => void>()
    const provider: ThemeProvider = {
      // Before the client goes live the provider reports the theme the server
      // rendered; `getServerTheme` is the same theme the markup was sent with.
      getTheme: () => (live.current ? dark : light),
      getServerTheme: () => light,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    }
    function Mode(): JSX.Element {
      const { mode, themeName } = useTheme()
      return (
        <span data-mode={mode()}>
          {mode()}
          {themeName()}
        </span>
      )
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const container = mount(() => (
        <ThemeContext.Provider value={provider}>
          <Mode />
        </ThemeContext.Provider>
      ))
      // The hydrating render shows the server theme — the markup it was sent.
      expect(container.querySelector('span')?.getAttribute('data-mode')).toBe('light')
      live.current = true
      listeners.forEach((listener) => listener(dark))
      await waitFor(() =>
        expect(container.querySelector('span')?.getAttribute('data-mode')).toBe('dark'),
      )
      expect(container.querySelector('span')?.textContent).toBe('darkdark')
      expect(consoleError).not.toHaveBeenCalled()
    } finally {
      consoleError.mockRestore()
    }
  })
})

describe('useRouter', () => {
  it('should return current location', () => {
    const router = createMockRouter()

    let result!: ReturnType<typeof useRouter>
    function Probe(): JSX.Element {
      result = useRouter()
      return <></>
    }

    mount(() => (
      <RouterContext.Provider value={router}>
        <Probe />
      </RouterContext.Provider>
    ))

    expect(result.location().pathname).toBe('/')
  })

  it('should navigate to new path', () => {
    const router = createMockRouter()

    let result!: ReturnType<typeof useRouter>
    function Probe(): JSX.Element {
      result = useRouter()
      return <></>
    }

    mount(() => (
      <RouterContext.Provider value={router}>
        <Probe />
      </RouterContext.Provider>
    ))

    result.navigate('/dashboard')

    expect(result.location().pathname).toBe('/dashboard')
  })
})

describe('useHttp', () => {
  it('publishes committed options before a child layout effect calls the action', async () => {
    const httpClient = createMockHttpClient()
    const [token, setToken] = createSignal('first')

    function Child(props: { execute: () => Promise<unknown>; token: string }): JSX.Element {
      // React's layout effect: it runs before the parent's passive effect and
      // must already see the committed props.
      createEffect(() => {
        void props.token
        void props.execute()
      })
      return <span>{props.token}</span>
    }

    function Parent(): JSX.Element {
      const { execute } = useHttp('GET', '/api/test', () => ({
        headers: { 'X-Selection': token() },
      }))
      return <Child execute={execute} token={token()} />
    }

    mount(() => (
      <HttpContext.Provider value={httpClient}>
        <Parent />
      </HttpContext.Provider>
    ))
    await settle()
    vi.mocked(httpClient.get).mockClear()

    setToken('second')
    await settle()

    expect(httpClient.get).toHaveBeenCalledOnce()
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', {
      headers: { 'X-Selection': 'second' },
    })
  })

  it('keeps a committed action on committed options while a new render suspends', async () => {
    const httpClient = createMockHttpClient()
    const pending = new Promise<string>(() => {})
    const [token, setToken] = createSignal('committed')
    const [load, setLoad] = createSignal(false)
    let execute!: () => Promise<unknown>

    function Committed(): JSX.Element {
      const request = useHttp('GET', '/api/test', () => ({
        headers: { 'X-Selection': token() },
      }))
      execute = request.execute
      return <></>
    }

    function Suspended(): JSX.Element {
      // The transition's pending work: this read suspends until the promise
      // above settles, which it never does here.
      const [value] = createResource(load, () => pending)
      return <span>{value()}</span>
    }

    mount(() => (
      <HttpContext.Provider value={httpClient}>
        <Suspense fallback={null}>
          <Committed />
          <Suspended />
        </Suspense>
      </HttpContext.Provider>
    ))

    // The next render suspends inside a transition and never commits, so the
    // action a caller holds still reads the committed options.
    void startTransition(() => {
      setToken('pending')
      setLoad(true)
    })
    await settle()
    await execute()

    expect(httpClient.get).toHaveBeenCalledWith('/api/test', {
      headers: { 'X-Selection': 'committed' },
    })
  })

  it('keeps execute stable across ordinary rerenders', () => {
    const httpClient = createMockHttpClient()
    const [tick, setTick] = createSignal(0)

    let result!: UseHttpResult<{ id: number }>
    function Probe(): JSX.Element {
      result = useHttp('GET', '/api/test')
      return <span>{tick()}</span>
    }

    mount(() => (
      <HttpContext.Provider value={httpClient}>
        <Probe />
      </HttpContext.Provider>
    ))

    const execute = result.execute
    setTick(1)
    expect(result.execute).toBe(execute)
  })

  it('keeps execute stable through its own state updates and inline options', async () => {
    const httpClient = createMockHttpClient()
    const [nonce, setNonce] = createSignal(0)

    let result!: UseHttpResult<{ id: number }>
    function Probe(): JSX.Element {
      result = useHttp<{ id: number }>('GET', '/api/test', () => ({
        // Rebuilt on every read, like an inline config in a component.
        headers: { 'X-Nonce': String(nonce()) },
        onSuccess: () => {},
      }))
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={httpClient}>
        <Probe />
      </HttpContext.Provider>
    ))

    const execute = result.execute

    // The primitive's own loading → data updates rerender its consumer.
    await result.execute()
    expect(result.data()).toEqual({ id: 1 })
    expect(result.execute).toBe(execute)

    // An ordinary parent update must not replace the action either.
    setNonce(1)
    expect(result.execute).toBe(execute)
  })

  it('runs exactly one request from an effect that depends on execute', async () => {
    const httpClient = createMockHttpClient()
    const successes: string[] = []
    let attempts = 0

    function Consumer(): JSX.Element {
      const { data, loading, execute } = useHttp<{ id: number }>('GET', '/api/test', {
        onSuccess: () => {
          successes.push('success')
        },
      })

      // React's [execute] dependency array: the effect's source is the action
      // identity, so it runs once and only once.
      createEffect(
        on(
          () => execute,
          () => {
            // Bounded fixture: an effect that re-fires because `execute` changed must
            // FAIL the call-count assertion, never spin the runner.
            if (attempts >= 3) return
            attempts += 1
            void execute()
          },
        ),
      )

      return <p>{loading() ? 'loading' : `id:${data()?.id ?? 'none'}`}</p>
    }

    const [tick, setTick] = createSignal(0)
    const { container } = mountWithCleanup(() => (
      <HttpContext.Provider value={httpClient}>
        <span>{tick()}</span>
        <Consumer />
      </HttpContext.Provider>
    ))

    await waitFor(() => expect(container.textContent).toContain('id:1'))

    // An unrelated parent update after the request settled must not re-run the effect.
    setTick(1)
    await settle()

    expect(httpClient.get).toHaveBeenCalledTimes(1)
    expect(successes).toEqual(['success'])
    expect(container.textContent).toContain('id:1')
  })

  it('sends the current options and callback on a later manual call', async () => {
    const httpClient = createMockHttpClient()
    const firstSuccess = vi.fn()
    const secondSuccess = vi.fn()
    const [version, setVersion] = createSignal('one')
    const [onSuccess, setOnSuccess] = createSignal<(data: { id: number }) => void>(firstSuccess)

    let result!: UseHttpResult<{ id: number }>
    function Probe(): JSX.Element {
      result = useHttp<{ id: number }>('POST', '/api/items', () => ({
        headers: { 'X-Version': version() },
        data: { name: 'widget' },
        onSuccess: onSuccess(),
      }))
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={httpClient}>
        <Probe />
      </HttpContext.Provider>
    ))

    const execute = result.execute

    batch(() => {
      setVersion('two')
      setOnSuccess(() => secondSuccess)
    })
    // Options do not churn the action; the call below still sends the latest ones.
    expect(result.execute).toBe(execute)

    await result.execute()

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
    interface Target {
      client: HttpClient
      method: 'GET' | 'DELETE'
      url: string
    }
    const [target, setTarget] = createSignal<Target>({
      client: firstClient,
      method: 'GET',
      url: '/api/one',
    })
    let seen: UseHttpResult<{ id: number }> | undefined

    function Probe(props: { method: 'GET' | 'DELETE'; url: string }): null {
      seen = useHttp<{ id: number }>(props.method, props.url)
      return null
    }

    // A changed provider re-creates the consumer under the new one, which is
    // how a Solid tree follows a context value.
    mount(() => (
      <Show when={target()} keyed>
        {(current: Target) => (
          <HttpContext.Provider value={current.client}>
            <Probe method={current.method} url={current.url} />
          </HttpContext.Provider>
        )}
      </Show>
    ))

    await seen?.execute()
    expect(firstClient.get).toHaveBeenCalledWith('/api/one', expect.any(Object))

    setTarget({ client: secondClient, method: 'DELETE', url: '/api/two' })

    await seen?.execute()
    expect(secondClient.delete).toHaveBeenCalledWith('/api/two', expect.any(Object))
    expect(secondClient.get).not.toHaveBeenCalled()
    expect(firstClient.get).toHaveBeenCalledTimes(1)
    expect(firstClient.delete).not.toHaveBeenCalled()
  })

  it('reports a failure through state and onError', async () => {
    const httpClient = createMockHttpClient()
    vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('nope'))
    const onError = vi.fn()

    let result!: UseHttpResult<unknown>
    function Probe(): JSX.Element {
      result = useHttp('GET', '/api/test', { onError })
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={httpClient}>
        <Probe />
      </HttpContext.Provider>
    ))

    await result.execute()

    expect(result.data()).toBeNull()
    expect(result.loading()).toBe(false)
    expect(result.error()?.message).toBe('nope')
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

    let result!: UseHttpResult<{ id: number }>
    function Probe(): JSX.Element {
      result = useHttp<{ id: number }>('GET', '/api/test', { onSuccess })
      return <></>
    }

    const { unmount } = mountWithCleanup(() => (
      <HttpContext.Provider value={httpClient}>
        <Probe />
      </HttpContext.Provider>
    ))

    const pending = result.execute()
    unmount()

    resolveRequest?.({
      data: { id: 7 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'GET', url: '/api/test' },
    })
    await pending
    await settle()

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('resets state without replacing execute', async () => {
    const httpClient = createMockHttpClient()

    let result!: UseHttpResult<{ id: number }>
    function Probe(): JSX.Element {
      result = useHttp<{ id: number }>('GET', '/api/test')
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={httpClient}>
        <Probe />
      </HttpContext.Provider>
    ))
    const execute = result.execute

    await result.execute()
    expect(result.data()).toEqual({ id: 1 })

    result.reset()

    expect(result.data()).toBeNull()
    expect(result.loading()).toBe(false)
    expect(result.error()).toBeNull()
    expect(result.execute).toBe(execute)
  })

  it.each(['success', 'failure'] as const)(
    'reset supersedes a late %s without cancelling its callback or return value',
    async (outcome) => {
      const held = heldGets()
      const onSuccess = vi.fn()
      const onError = vi.fn()

      let result!: UseHttpResult<string>
      function Probe(): JSX.Element {
        result = useHttp<string>('GET', '/api/tags', { onSuccess, onError })
        return <></>
      }

      mount(() => (
        <HttpContext.Provider value={held.client}>
          <Probe />
        </HttpContext.Provider>
      ))

      const pending = result.execute()
      result.reset()

      if (outcome === 'success') {
        await held.answer(0, 'late')
        await expect(pending).resolves.toBe('late')
        expect(onSuccess).toHaveBeenCalledExactlyOnceWith('late')
        expect(onError).not.toHaveBeenCalled()
      } else {
        const error = new Error('late failure')
        await held.fail(0, error)
        await expect(pending).resolves.toBeNull()
        expect(onError).toHaveBeenCalledExactlyOnceWith(error)
        expect(onSuccess).not.toHaveBeenCalled()
      }
      expect(result.data()).toBeNull()
      expect(result.loading()).toBe(false)
      expect(result.error()).toBeNull()
      void result.execute()
      await held.answer(1, 'after reset')
      expect(result.data()).toBe('after reset')
      expect(result.loading()).toBe(false)
      expect(result.error()).toBeNull()
    },
  )

  it.each(['success', 'failure'] as const)(
    'suppresses callbacks after unmount on %s while preserving the request return value',
    async (outcome) => {
      const held = heldGets()
      const onSuccess = vi.fn()
      const onError = vi.fn()

      let result!: UseHttpResult<string>
      function Probe(): JSX.Element {
        result = useHttp<string>('GET', '/api/tags', { onSuccess, onError })
        return <></>
      }

      const { unmount } = mountWithCleanup(() => (
        <HttpContext.Provider value={held.client}>
          <Probe />
        </HttpContext.Provider>
      ))
      const execute = result.execute
      const pending = execute()
      unmount()

      if (outcome === 'success') {
        await held.answer(0, 'late')
        await expect(pending).resolves.toBe('late')
      } else {
        await held.fail(0, new Error('late failure'))
        await expect(pending).resolves.toBeNull()
      }
      expect(onSuccess).not.toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
      await expect(execute()).resolves.toBeNull()
      expect(held.client.get).toHaveBeenCalledTimes(1)
    },
  )

  it('stays finite when StrictMode runs the consumer effect twice', async () => {
    const httpClient = createMockHttpClient()
    const [run, setRun] = createSignal(0)
    let attempts = 0
    let replay!: () => void

    function Consumer(): JSX.Element {
      const { data, execute } = useHttp<{ id: number }>('GET', '/api/test')
      // The effect's dependency is the action identity; the second run is the
      // same double invocation React's StrictMode replays. A THIRD run means
      // execute was replaced. The cap keeps that regression a failed
      // assertion, not a spin.
      createEffect(
        on(run, () => {
          if (attempts >= 3) return
          attempts += 1
          void execute()
        }),
      )
      replay = () => setRun((value) => value + 1)
      return <p>{data() ? `id:${data()?.id}` : 'id:none'}</p>
    }

    const { container } = mountWithCleanup(() => (
      <HttpContext.Provider value={httpClient}>
        <Consumer />
      </HttpContext.Provider>
    ))

    await waitFor(() => expect(container.textContent).toBe('id:1'))
    replay()
    await settle()

    expect(vi.mocked(httpClient.get).mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(vi.mocked(httpClient.get).mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('should make GET request', async () => {
    const httpClient = createMockHttpClient()

    let result!: UseHttpResult<{ id: number }>
    function Probe(): JSX.Element {
      result = useHttp<{ id: number }>('GET', '/api/test')
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={httpClient}>
        <Probe />
      </HttpContext.Provider>
    ))

    expect(result.loading()).toBe(false)
    expect(result.data()).toBeNull()

    await result.execute()

    expect(result.data()).toEqual({ id: 1 })
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', expect.any(Object))
  })

  it('shows the newest request when an older one answers after it', async () => {
    const held = heldGets()
    const seen: unknown[] = []

    let result!: UseHttpResult<string>
    function Probe(): JSX.Element {
      result = useHttp<string>('GET', '/api/tags', { onSuccess: (data) => seen.push(data) })
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={held.client}>
        <Probe />
      </HttpContext.Provider>
    ))

    void result.execute()
    void result.execute()
    await held.answer(1, 'newer')
    expect(result.data()).toBe('newer')
    expect(result.loading()).toBe(false)
    // The first load answers late: it must not replace what the newer one showed.
    await held.answer(0, 'older')
    expect(result.data()).toBe('newer')
    // Each request still reports its own outcome to its callback.
    expect(seen).toEqual(['newer', 'older'])
  })

  it('keeps loading while a newer request is in flight after an older one answers', async () => {
    const held = heldGets()

    let result!: UseHttpResult<string>
    function Probe(): JSX.Element {
      result = useHttp<string>('GET', '/api/tags')
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={held.client}>
        <Probe />
      </HttpContext.Provider>
    ))

    void result.execute()
    void result.execute()
    await held.answer(0, 'older')
    expect(result.loading()).toBe(true)
    expect(result.data()).toBeNull()
    await held.fail(1, new Error('offline'))
    expect(result.loading()).toBe(false)
    expect(result.error()?.message).toBe('offline')
  })

  it('does not let a request answered after reset repopulate the state', async () => {
    const held = heldGets()

    let result!: UseHttpResult<string>
    function Probe(): JSX.Element {
      result = useHttp<string>('GET', '/api/tags')
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={held.client}>
        <Probe />
      </HttpContext.Provider>
    ))

    void result.execute()
    result.reset()
    await held.answer(0, 'late')
    expect(result.data()).toBeNull()
    expect(result.loading()).toBe(false)
    expect(result.error()).toBeNull()
  })

  it('still shows a single request answered in order', async () => {
    const held = heldGets()

    let result!: UseHttpResult<string>
    function Probe(): JSX.Element {
      result = useHttp<string>('GET', '/api/tags')
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={held.client}>
        <Probe />
      </HttpContext.Provider>
    ))

    void result.execute()
    expect(result.loading()).toBe(true)
    await held.answer(0, 'only')
    expect(result.data()).toBe('only')
    expect(result.loading()).toBe(false)
    expect(result.error()).toBeNull()
  })

  it('returns each request outcome while only the newest request owns state', async () => {
    const held = heldGets()
    const onError = vi.fn()

    let result!: UseHttpResult<string>
    function Probe(): JSX.Element {
      result = useHttp<string>('GET', '/api/tags', { onError })
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={held.client}>
        <Probe />
      </HttpContext.Provider>
    ))

    const older = result.execute()
    const newer = result.execute()
    await held.answer(1, 'newer')
    await expect(newer).resolves.toBe('newer')
    const error = new Error('older request failed')
    await held.fail(0, error)
    await expect(older).resolves.toBeNull()
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
    expect(result.data()).toBe('newer')
    expect(result.loading()).toBe(false)
    expect(result.error()).toBeNull()

    const secondOlder = result.execute()
    const secondNewer = result.execute()
    await held.answer(3, 'latest')
    await held.answer(2, 'superseded')
    await expect(secondOlder).resolves.toBe('superseded')
    await expect(secondNewer).resolves.toBe('latest')
    expect(result.data()).toBe('latest')
  })

  it('keeps each submit callback even when a newer submit owns state', async () => {
    const held = heldGets()
    vi.mocked(held.client.post).mockImplementation((_url, _data, config) =>
      held.client.get('/api/items', config),
    )
    const navigate = vi.fn()

    let result!: UseHttpResult<string>
    function Probe(): JSX.Element {
      result = useHttp<string>('POST', '/api/items', { onSuccess: navigate })
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={held.client}>
        <Probe />
      </HttpContext.Provider>
    ))

    void result.execute()
    void result.execute()
    await held.answer(1, 'second receipt')
    await held.answer(0, 'first receipt')
    expect(navigate.mock.calls).toEqual([['second receipt'], ['first receipt']])
    expect(result.data()).toBe('second receipt')
  })

  it('shows the newest immediate request when StrictMode replays the mount effect', async () => {
    const held = heldGets()
    const onSuccess = vi.fn()

    let result!: UseHttpResult<string>
    function Probe(): JSX.Element {
      result = useHttp<string>('GET', '/api/tags', { immediate: true, onSuccess })
      // React's StrictMode runs the mount effect a second time. Solid has no
      // replay, so the same mount-effect body runs once here: the primitive
      // must let the newest request own the state and still report both.
      createEffect(() => {
        void result.execute()
      })
      return <></>
    }

    mount(() => (
      <HttpContext.Provider value={held.client}>
        <Probe />
      </HttpContext.Provider>
    ))
    await settle()
    expect(held.client.get).toHaveBeenCalledTimes(2)
    await held.answer(1, 'current mount')
    await held.answer(0, 'replayed mount')
    expect(result.data()).toBe('current mount')
    expect(result.loading()).toBe(false)
    expect(result.error()).toBeNull()
    expect(onSuccess.mock.calls).toEqual([['current mount'], ['replayed mount']])
  })
})

describe('useStorageValue', () => {
  it('should load and set storage value', async () => {
    const storageProvider = createMockStorageProvider()

    let result!: ReturnType<typeof useStorageValue<string>>
    function Probe(): JSX.Element {
      result = useStorageValue<string>('theme', { defaultValue: 'light' })
      return <></>
    }

    mount(() => (
      <StorageContext.Provider value={storageProvider}>
        <Probe />
      </StorageContext.Provider>
    ))

    // Wait for initial load
    await waitFor(() => {
      expect(result.loading()).toBe(false)
    })

    expect(result.value()).toBe('light')

    await result.setValue('dark')

    expect(result.value()).toBe('dark')
  })
})

describe('useLogger', () => {
  it('should return a logger instance', () => {
    const loggerProvider = createMockLoggerProvider()

    let result!: Logger
    function Probe(): JSX.Element {
      result = useLogger('TestComponent')
      return <></>
    }

    mount(() => (
      <LoggerContext.Provider value={loggerProvider}>
        <Probe />
      </LoggerContext.Provider>
    ))

    expect(result).toBeDefined()
    expect(typeof result.info).toBe('function')

    result.info('test message')
    expect(loggerProvider.getLogger().info).toHaveBeenCalled()
  })
})

describe('Provider errors', () => {
  // The primitive is HANDED its store, so it must work with no provider at all
  // (X1 flash-m100): an app that made its store with a provider package's own
  // `createStoreWithActions()` — never calling `setProvider()` — had every page
  // throw "useStateProvider must be used within a StateProvider" on mount, from
  // a primitive that only ever calls `store.getState()` / `store.subscribe()`.
  it('should render useStore(store) with no StateProvider anywhere', async () => {
    const store = createMockStore({ count: 0 })

    let result!: Accessor<number>
    function Probe(): JSX.Element {
      result = useStore(store, { selector: (state) => state.count })
      return <></>
    }

    mount(() => <Probe />)

    expect(result()).toBe(0)

    store.setState({ count: 1 })
    await settle()
    expect(result()).toBe(1)
  })

  it('should name the fix when useStateProvider is used outside StateProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Probe(): JSX.Element {
      useStateProvider()
      return <></>
    }

    const thrown = mountExpectingThrow(() => <Probe />)

    expect(thrown.message).toContain('useStateProvider must be used within a StateProvider')
    // The message has to carry the fix, not just the diagnosis: the import line,
    // the bond that supplies the provider by default, and the primitive to reach
    // for when the caller already holds a store.
    expect(thrown.message).toContain(
      "import { MoleculeProvider, StateProvider } from '@molecule/app-solid'",
    )
    expect(thrown.message).toContain('setupAllDefaultBonds()')
    expect(thrown.message).toContain('useStore(store)')

    consoleSpy.mockRestore()
  })

  it('should throw when useAuth is used outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Probe(): JSX.Element {
      useAuth()
      return <></>
    }

    const thrown = mountExpectingThrow(() => <Probe />)

    expect(thrown.message).toContain('useAuthClient must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})
