// @vitest-environment jsdom

/**
 * The framework-binding contract React's `hooks.test.tsx` pins, run against the
 * Vue composables. Every title is the React test's; only the framework-forced
 * mechanics change: a composable runs in `setup()` instead of a hook, refs
 * replace returned values, a mounted component replaces a render, and each
 * React-only mechanism is translated where its case says so.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import {
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  type PropType,
  ref,
  watch,
} from 'vue'
import { renderToString } from 'vue/server-renderer'

import type { AuthClient, AuthResult, AuthSessionSeed, AuthState } from '@molecule/app-auth'
import type { HttpResponse, RequestConfig } from '@molecule/app-http'
import type { Logger, LoggerProvider, LogLevel } from '@molecule/app-logger'
import type { RouteChangeListener, RouteLocation, RouteParams, Router } from '@molecule/app-routing'
import type { StateListener, StateProvider, Store } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import { darkTheme, lightTheme, type Theme, type ThemeProvider } from '@molecule/app-theme'

import {
  useAuth,
  useHttp,
  useLogger,
  useRouter,
  useStateProvider,
  useStorageValue,
  useStore,
  useTheme,
} from '../composables/index.js'
import { moleculePlugin } from '../plugin.js'
import type { UseHttpResult } from '../types.js'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
})

/**
 * Mounts a component whose setup runs `capture` and renders an empty div.
 *
 * @param capture - Calls the composables inside setup.
 * @param services - The providers `moleculePlugin` installs.
 * @returns The mounted wrapper.
 */
function mountComposable(
  capture: () => void,
  services: Record<string, unknown> = {},
): ReturnType<typeof mount> {
  const wrapper = mount(
    defineComponent({
      setup() {
        capture()
        return () => h('div')
      },
    }),
    { global: { plugins: [[moleculePlugin, services]] } },
  )
  mounted.push(wrapper)
  return wrapper
}

/**
 * Waits one macrotask so a settled request's continuation (and the update it
 * made) has run.
 *
 * @returns A promise that resolves after the task queue turns.
 */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

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
      const next = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...next }
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
    createStore: <T>(config: { initialState: T }) => createMockStore(config.initialState),
  }
}

/**
 * A mock auth client with a mutable session state, so a test can publish a
 * session change the way a real client announces one.
 */
interface MockAuthClient<T> extends AuthClient<T> {
  /**
   * Publishes a new status to every subscriber.
   *
   * @param status - The next session status.
   */
  setStatus(status: AuthState<T>['status']): void
}

/**
 * Creates a mock auth client for testing.
 *
 * @param options - The cached user, the user `login` resolves with, and an
 *   initial status other than the one the cached user implies.
 * @returns A mock auth client instance.
 */
function createMockAuthClient<T>(
  options: {
    user?: T | null
    loginUser?: T | null
    status?: AuthState<T>['status']
  } = {},
): MockAuthClient<T> {
  const listeners = new Set<(state: AuthState<T>) => void>()
  const snapshot = (user: T | null): AuthState<T> => ({
    status: user === null ? 'unauthenticated' : 'authenticated',
    initialized: true,
    authenticated: user !== null,
    user,
    loading: false,
    error: null,
  })
  let state: AuthState<T> = options.status
    ? { ...snapshot(options.user ?? null), status: options.status }
    : snapshot(options.user ?? null)
  const publish = (next: AuthState<T>): void => {
    state = next
    listeners.forEach((listener) => listener(next))
  }

  return {
    getState: () => state,
    isAuthenticated: () => state.authenticated,
    getUser: () => state.user,
    setUser: vi.fn((user: T | null) => publish(snapshot(user))),
    getAccessToken: () => (state.authenticated ? 'mock-access-token' : null),
    setAccessToken: vi.fn(),
    setSession: vi.fn((session: AuthSessionSeed<T>) => publish(snapshot(session.user))),
    getRefreshToken: () => (state.authenticated ? 'mock-refresh-token' : null),
    login: vi.fn(async (): Promise<AuthResult<T>> => {
      const user = options.loginUser ?? options.user ?? null
      if (user === null) throw new Error('the mock client has no login user')
      publish(snapshot(user))
      return { user, accessToken: 'token', expiresAt: Date.now() + 3600000 }
    }),
    logout: vi.fn(async () => publish(snapshot(null))),
    register: vi.fn(),
    refresh: vi.fn(async (): Promise<AuthResult<T>> => {
      const user = options.user ?? options.loginUser ?? null
      if (user === null) throw new Error('the mock client has no session to refresh')
      publish(snapshot(user))
      return { user }
    }),
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
    setStatus: (status: AuthState<T>['status']) => publish({ ...state, status }),
  }
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

/** A scripted HTTP client whose methods the tests assert on and steer. */
interface ScriptedHttpClient {
  get: Mock<(url: string, config?: RequestConfig) => Promise<HttpResponse<unknown>>>
  post: Mock<
    (url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<unknown>>
  >
  put: Mock<(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<unknown>>>
  patch: Mock<
    (url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<unknown>>
  >
  delete: Mock<(url: string, config?: RequestConfig) => Promise<HttpResponse<unknown>>>
}

/**
 * Builds a response body.
 *
 * @param data - The response data.
 * @returns The response.
 */
function okResponse<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/**
 * Creates a mock HTTP client for testing.
 *
 * @returns A mock HTTP client instance.
 */
function createMockHttpClient(): ScriptedHttpClient {
  return {
    get: vi.fn<(url: string, config?: RequestConfig) => Promise<HttpResponse<unknown>>>(async () =>
      okResponse({ id: 1 }),
    ),
    post: vi.fn<(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse>>(
      async () => ({ ...okResponse({ id: 1 }), status: 201, statusText: 'Created' }),
    ),
    put: vi.fn<(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse>>(
      async () => okResponse({ id: 1 }),
    ),
    patch: vi.fn<(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse>>(
      async () => okResponse({ id: 1 }),
    ),
    delete: vi.fn<(url: string, config?: RequestConfig) => Promise<HttpResponse>>(async () =>
      okResponse(null),
    ),
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
    get: async <T>(key: string) => (storage.has(key) ? (storage.get(key) as T) : null),
    set: async <T>(key: string, value: T) => {
      storage.set(key, value)
    },
    remove: async (key: string) => {
      storage.delete(key)
    },
    clear: async () => {
      storage.clear()
    },
    keys: async () => [...storage.keys()],
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
    setLevel: vi.fn((_level: LogLevel) => {}),
    getLevel: () => 'info',
    child: () => mockLogger,
    withContext: () => mockLogger,
    addTransport: vi.fn(() => () => {}),
    removeTransport: vi.fn(),
  }

  return {
    getLogger: () => mockLogger,
    createLogger: () => mockLogger,
    setLevel: vi.fn((_level: LogLevel) => {}),
    getLevel: () => 'info',
    addTransport: vi.fn(() => () => {}),
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: () => true,
  }
}

describe('useStore', () => {
  it('should return current state from store', () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()
    let state!: ReturnType<typeof useStore<{ count: number }>>

    mountComposable(
      () => {
        state = useStore(store)
      },
      { state: stateProvider },
    )

    expect(state.value).toEqual({ count: 0 })
  })

  it('should update when store state changes', async () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()
    let state!: ReturnType<typeof useStore<{ count: number }>>

    mountComposable(
      () => {
        state = useStore(store)
      },
      { state: stateProvider },
    )

    expect(state.value.count).toBe(0)

    store.setState({ count: 5 })
    await nextTick()

    expect(state.value.count).toBe(5)
  })

  it('should support selector option', () => {
    const store = createMockStore({ count: 10, name: 'test' })
    const stateProvider = createMockStateProvider()
    let selected!: ReturnType<typeof useStore<{ count: number; name: string }, number>>

    mountComposable(
      () => {
        selected = useStore(store, { selector: (s) => s.count * 2 })
      },
      { state: stateProvider },
    )

    expect(selected.value).toBe(20)
  })
})

describe('useAuth', () => {
  it('should return auth state', () => {
    const authClient = createMockAuthClient<{ id: string }>()
    let auth!: ReturnType<typeof useAuth<{ id: string }>>

    mountComposable(
      () => {
        auth = useAuth()
      },
      { auth: authClient },
    )

    expect(auth.isAuthenticated.value).toBe(false)
    expect(auth.user.value).toBeNull()
  })

  it('should login and update state', async () => {
    const authClient = createMockAuthClient<{ id: string; email: string }>({
      loginUser: { id: '1', email: 'test@example.com' },
    })
    let auth!: ReturnType<typeof useAuth<{ id: string; email: string }>>

    mountComposable(
      () => {
        auth = useAuth<{ id: string; email: string }>()
      },
      { auth: authClient },
    )

    await auth.login({ email: 'test@example.com', password: 'password' })

    expect(auth.isAuthenticated.value).toBe(true)
    expect(auth.user.value?.email).toBe('test@example.com')
  })

  it('re-renders when only the status changes', async () => {
    // xr-molecule-flash-m173's cache: the snapshot compared the user and the flags but not
    // `status`, so a session check that reported 'unavailable' with the SAME user kept rendering
    // the old status — a state change the composable silently dropped.
    const authClient = createMockAuthClient<{ id: string }>({ status: 'loading' })
    let auth!: ReturnType<typeof useAuth<{ id: string }>>

    mountComposable(
      () => {
        auth = useAuth<{ id: string }>()
      },
      { auth: authClient },
    )

    expect(auth.state.value.status).toBe('loading')
    // `status` is also exposed at the top level: it is the ONE value a route guard
    // or a page renders the session from, so it must not be reachable only through
    // `state` (xr-molecule-flash-m177).
    expect(auth.status.value).toBe('loading')

    authClient.setStatus('unavailable')
    await nextTick()

    expect(auth.state.value.status).toBe('unavailable')
    expect(auth.status.value).toBe('unavailable')
  })
})

describe('useTheme', () => {
  it('should return current theme', () => {
    const themeProvider = createMockThemeProvider()
    let theme!: ReturnType<typeof useTheme>

    mountComposable(
      () => {
        theme = useTheme()
      },
      { theme: themeProvider },
    )

    expect(theme.themeName.value).toBe('light')
    expect(theme.mode.value).toBe('light')
  })

  it('should toggle theme via the provider toggleMode method', async () => {
    const themeProvider = createMockThemeProvider()
    const toggleModeSpy = vi.spyOn(themeProvider, 'toggleMode')
    let theme!: ReturnType<typeof useTheme>

    mountComposable(
      () => {
        theme = useTheme()
      },
      { theme: themeProvider },
    )

    theme.toggleTheme()
    await nextTick()

    // `toggleTheme` must delegate to the provider's purpose-built
    // `toggleMode()` rather than index-cycling `getThemes()`.
    expect(toggleModeSpy).toHaveBeenCalledOnce()
    expect(theme.themeName.value).toBe('dark')
  })

  it('falls back to cycling getThemes() when the provider has no toggleMode', async () => {
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
        listeners.forEach((listener) => listener())
      },
      onThemeChange: (listener: () => void) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    }
    let theme!: ReturnType<typeof useTheme>

    // Passed as the plugin's theme: the object deliberately lacks `toggleMode`
    // and `subscribe`, exactly like a provider written before they existed.
    mountComposable(
      () => {
        theme = useTheme()
      },
      { theme: legacyProvider },
    )

    theme.toggleTheme()
    await nextTick()

    expect(theme.themeName.value).toBe('dark')
  })

  // A static site prerenders on a server that reads no storage and no OS
  // preference, then hydrates in a browser that reads both. The composable must
  // render the server's theme while hydrating — the markup it was sent — and
  // switch afterwards, or Vue fixes a hydration mismatch by discarding that
  // markup.
  it('hydrates with the server theme, then switches to the live one, without a mismatch', async () => {
    const light: Theme = createMockThemeProvider().getTheme()
    const dark: Theme = { ...light, name: 'dark', mode: 'dark' }
    const serverProvider: ThemeProvider = {
      getTheme: () => light,
      getServerTheme: () => light,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
    }
    const clientProvider: ThemeProvider = {
      getTheme: () => dark,
      getServerTheme: () => light,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
    }
    const Mode = defineComponent({
      setup() {
        const { mode, themeName } = useTheme()
        return () => h('span', { 'data-mode': mode.value }, `${mode.value}${themeName.value}`)
      },
    })
    const serverApp = createSSRApp({ render: () => h(Mode) })
    serverApp.use(moleculePlugin, { theme: serverProvider })
    const html = await renderToString(serverApp)
    expect(html).toContain('data-mode="light"')
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const clientApp = createSSRApp({ render: () => h(Mode) })
      clientApp.use(moleculePlugin, { theme: clientProvider })
      clientApp.mount(container)
      await nextTick()
      expect(container.querySelector('span')?.getAttribute('data-mode')).toBe('dark')
      expect(container.querySelector('span')?.textContent).toBe('darkdark')
      expect(consoleError).not.toHaveBeenCalled()
      expect(
        consoleWarn.mock.calls.filter((args) => String(args[0]).includes('Hydration')),
      ).toEqual([])
    } finally {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
      container.remove()
    }
  })
})

describe('useRouter', () => {
  it('should return current location', () => {
    const router = createMockRouter()
    let routing!: ReturnType<typeof useRouter>

    mountComposable(
      () => {
        routing = useRouter()
      },
      { router },
    )

    expect(routing.location.value.pathname).toBe('/')
  })

  it('should navigate to new path', async () => {
    const router = createMockRouter()
    let routing!: ReturnType<typeof useRouter>

    mountComposable(
      () => {
        routing = useRouter()
      },
      { router },
    )

    routing.navigate('/dashboard')
    await nextTick()

    expect(routing.location.value.pathname).toBe('/dashboard')
  })
})

describe('useHttp', () => {
  it('publishes committed options before a child layout effect calls the action', async () => {
    const httpClient = createMockHttpClient()
    const token = ref('first')

    const Child = defineComponent({
      props: {
        token: { type: String, required: true },
        execute: { type: Function as PropType<() => Promise<unknown>>, required: true },
      },
      setup(props) {
        onMounted(() => {
          void props.execute()
        })
        // React's child layout effect lists `token` too; each committed change
        // re-runs the call, which must see the parent's committed options.
        watch(
          () => props.token,
          () => {
            void props.execute()
          },
        )
        return () => h('span', props.token)
      },
    })

    const Parent = defineComponent({
      setup() {
        const request = useHttp('GET', '/api/test', () => ({
          headers: { 'X-Selection': token.value },
        }))
        return () => h(Child, { token: token.value, execute: request.execute })
      },
    })

    const wrapper = mount(Parent, {
      global: { plugins: [[moleculePlugin, { http: httpClient }]] },
    })
    mounted.push(wrapper)
    await settle()
    httpClient.get.mockClear()
    token.value = 'second'
    await settle()
    expect(httpClient.get).toHaveBeenCalledOnce()
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', {
      headers: { 'X-Selection': 'second' },
    })
  })

  it('keeps a committed action on committed options while a new render suspends', async () => {
    const httpClient = createMockHttpClient()
    const token = ref('committed')
    let request!: UseHttpResult<{ id: number }>

    mountComposable(
      () => {
        request = useHttp<{ id: number }>('GET', '/api/test', () => ({
          headers: { 'X-Selection': token.value },
        }))
      },
      { http: httpClient },
    )
    const execute = request.execute
    // React throws from the new render, so the hook keeps the committed options.
    // Vue has no discarded render: a changed argument IS the committed one, and
    // the already-captured action must send it rather than its setup-time value.
    token.value = 'pending'
    await execute()
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', {
      headers: { 'X-Selection': 'pending' },
    })
  })

  it('keeps execute stable across ordinary rerenders', async () => {
    const httpClient = createMockHttpClient()
    const nonce = ref(0)
    let request!: UseHttpResult<unknown>

    mountComposable(
      () => {
        request = useHttp('GET', '/api/test', () => ({
          headers: { 'X-Nonce': String(nonce.value) },
        }))
      },
      { http: httpClient },
    )
    const execute = request.execute
    nonce.value = 1
    await nextTick()
    expect(request.execute).toBe(execute)
  })

  it('keeps execute stable through its own state updates and inline options', async () => {
    const httpClient = createMockHttpClient()
    const nonce = ref(0)
    let request!: UseHttpResult<{ id: number }>

    mountComposable(
      () => {
        request = useHttp<{ id: number }>('GET', '/api/test', () => ({
          // Rebuilt on every render, like an inline config in a component.
          headers: { 'X-Nonce': String(nonce.value) },
          onSuccess: () => {},
        }))
      },
      { http: httpClient },
    )
    const execute = request.execute

    // The composable's own loading → data updates rerender it.
    await request.execute()
    expect(request.data.value).toEqual({ id: 1 })
    expect(request.execute).toBe(execute)

    // An ordinary parent rerender must not replace the action either.
    nonce.value = 1
    await nextTick()
    expect(request.execute).toBe(execute)
  })

  it('runs exactly one request from an effect that depends on execute', async () => {
    const httpClient = createMockHttpClient()
    const successes: string[] = []
    let attempts = 0

    const Consumer = defineComponent({
      setup() {
        const { data, loading, execute } = useHttp<{ id: number }>('GET', '/api/test', () => ({
          onSuccess: () => {
            successes.push('success')
          },
        }))
        onMounted(() => {
          // Bounded fixture: work that re-fires because `execute` changed must
          // FAIL the call-count assertion, never spin the runner.
          if (attempts >= 3) return
          attempts += 1
          void execute()
        })
        return () => h('p', loading.value ? 'loading' : `id:${data.value?.id ?? 'none'}`)
      },
    })

    const wrapper = mount(Consumer, {
      global: { plugins: [[moleculePlugin, { http: httpClient }]] },
    })
    mounted.push(wrapper)

    await vi.waitFor(() => expect(wrapper.text()).toBe('id:1'))

    // A rerender after the request settled must not re-run the mount work.
    wrapper.vm.$forceUpdate()
    await settle()

    expect(httpClient.get).toHaveBeenCalledTimes(1)
    expect(successes).toEqual(['success'])
    expect(wrapper.text()).toBe('id:1')
  })

  it('sends the current options and callback on a later manual call', async () => {
    const httpClient = createMockHttpClient()
    const firstSuccess = vi.fn()
    const secondSuccess = vi.fn()
    const version = ref('one')
    let onSuccess = firstSuccess
    let request!: UseHttpResult<{ id: number }>

    mountComposable(
      () => {
        request = useHttp<{ id: number }>('POST', '/api/items', () => ({
          headers: { 'X-Version': version.value },
          data: { name: 'widget' },
          onSuccess,
        }))
      },
      { http: httpClient },
    )

    const execute = request.execute

    version.value = 'two'
    onSuccess = secondSuccess
    // Options do not churn the action; the call below still sends the latest ones.
    expect(request.execute).toBe(execute)

    await request.execute()

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
    const active = ref(firstClient)
    const switching: ScriptedHttpClient = {
      get: vi.fn((url, config) => active.value.get(url, config)),
      post: vi.fn((url, data, config) => active.value.post(url, data, config)),
      put: vi.fn((url, data, config) => active.value.put(url, data, config)),
      patch: vi.fn((url, data, config) => active.value.patch(url, data, config)),
      delete: vi.fn((url, config) => active.value.delete(url, config)),
    }
    const method = ref<'GET' | 'DELETE'>('GET')
    const url = ref('/api/one')
    let request!: UseHttpResult<{ id: number }>

    mountComposable(
      () => {
        request = useHttp<{ id: number }>(method, url)
      },
      { http: switching },
    )

    await request.execute()
    expect(firstClient.get).toHaveBeenCalledWith('/api/one', expect.any(Object))

    method.value = 'DELETE'
    url.value = '/api/two'
    active.value = secondClient
    await nextTick()

    await request.execute()
    expect(secondClient.delete).toHaveBeenCalledWith('/api/two', expect.any(Object))
    expect(secondClient.get).not.toHaveBeenCalled()
    expect(firstClient.get).toHaveBeenCalledTimes(1)
    expect(firstClient.delete).not.toHaveBeenCalled()
  })

  it('reports a failure through state and onError', async () => {
    const httpClient = createMockHttpClient()
    httpClient.get.mockRejectedValueOnce(new Error('nope'))
    const onError = vi.fn()
    let request!: UseHttpResult<unknown>

    mountComposable(
      () => {
        request = useHttp('GET', '/api/test', () => ({ onError }))
      },
      { http: httpClient },
    )

    await request.execute()

    expect(request.data.value).toBeNull()
    expect(request.loading.value).toBe(false)
    expect(request.error.value?.message).toBe('nope')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('does not deliver a response to an unmounted hook', async () => {
    const httpClient = createMockHttpClient()
    const onSuccess = vi.fn()
    let resolveRequest: ((response: HttpResponse<unknown>) => void) | undefined
    httpClient.get.mockReturnValueOnce(
      new Promise<HttpResponse<unknown>>((resolve) => {
        resolveRequest = resolve
      }),
    )
    let request!: UseHttpResult<{ id: number }>

    const wrapper = mountComposable(
      () => {
        request = useHttp<{ id: number }>('GET', '/api/test', () => ({ onSuccess }))
      },
      { http: httpClient },
    )

    const pending = request.execute()
    wrapper.unmount()

    resolveRequest?.(okResponse({ id: 7 }))
    await pending

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('resets state without replacing execute', async () => {
    const httpClient = createMockHttpClient()
    let request!: UseHttpResult<{ id: number }>

    mountComposable(
      () => {
        request = useHttp<{ id: number }>('GET', '/api/test')
      },
      { http: httpClient },
    )
    const execute = request.execute

    await request.execute()
    expect(request.data.value).toEqual({ id: 1 })

    request.reset()
    await nextTick()

    expect(request.data.value).toBeNull()
    expect(request.loading.value).toBe(false)
    expect(request.error.value).toBeNull()
    expect(request.execute).toBe(execute)
  })

  it('stays finite when StrictMode runs the consumer effect twice', async () => {
    const httpClient = createMockHttpClient()
    let attempts = 0

    const Consumer = defineComponent({
      setup() {
        const { data, execute } = useHttp<{ id: number }>('GET', '/api/test')
        onMounted(() => {
          // Vue mounts a component once, so more than one mount run means the
          // mount work re-fired. The cap keeps that a failed assertion, not a spin.
          if (attempts >= 3) return
          attempts += 1
          void execute()
        })
        return () => h('p', data.value ? `id:${data.value.id}` : 'id:none')
      },
    })

    const wrapper = mount(Consumer, {
      global: { plugins: [[moleculePlugin, { http: httpClient }]] },
    })
    mounted.push(wrapper)

    await vi.waitFor(() => expect(wrapper.text()).toBe('id:1'))
    wrapper.vm.$forceUpdate()
    await settle()

    // One mount, never a chain of them.
    expect(httpClient.get).toHaveBeenCalledTimes(1)
    expect(attempts).toBe(1)
  })

  it('should make GET request', async () => {
    const httpClient = createMockHttpClient()
    let request!: UseHttpResult<{ id: number }>

    mountComposable(
      () => {
        request = useHttp<{ id: number }>('GET', '/api/test')
      },
      { http: httpClient },
    )

    expect(request.loading.value).toBe(false)
    expect(request.data.value).toBeNull()

    await request.execute()

    expect(request.data.value).toEqual({ id: 1 })
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', expect.any(Object))
  })

  /** A GET whose answers the test releases by hand, in any order. */
  function heldGets(): {
    client: ScriptedHttpClient
    answer: (index: number, data: unknown) => Promise<void>
    fail: (index: number, error: Error) => Promise<void>
  } {
    const client = createMockHttpClient()
    const pending: Array<{
      resolve: (value: HttpResponse<unknown>) => void
      reject: (error: Error) => void
    }> = []
    client.get.mockImplementation(
      () =>
        new Promise<HttpResponse<unknown>>((resolve, reject) => {
          pending.push({ resolve, reject })
        }),
    )
    return {
      client,
      answer: async (index, data) => {
        pending[index].resolve(okResponse(data))
        await settle()
      },
      fail: async (index, error) => {
        pending[index].reject(error)
        await settle()
      },
    }
  }

  it('shows the newest request when an older one answers after it', async () => {
    const held = heldGets()
    const seen: unknown[] = []
    let request!: UseHttpResult<string>

    mountComposable(
      () => {
        request = useHttp<string>('GET', '/api/tags', () => ({
          onSuccess: (data) => seen.push(data),
        }))
      },
      { http: held.client },
    )

    void request.execute()
    void request.execute()
    await held.answer(1, 'newer')
    expect(request.data.value).toBe('newer')
    expect(request.loading.value).toBe(false)
    // The first load answers late: it must not replace what the newer one showed.
    await held.answer(0, 'older')
    expect(request.data.value).toBe('newer')
    // Each request still reports its own outcome to its callback.
    expect(seen).toEqual(['newer', 'older'])
  })

  it('keeps loading while a newer request is in flight after an older one answers', async () => {
    const held = heldGets()
    let request!: UseHttpResult<string>

    mountComposable(
      () => {
        request = useHttp<string>('GET', '/api/tags')
      },
      { http: held.client },
    )

    void request.execute()
    void request.execute()
    await held.answer(0, 'older')
    expect(request.loading.value).toBe(true)
    expect(request.data.value).toBeNull()
    await held.fail(1, new Error('offline'))
    expect(request.loading.value).toBe(false)
    expect(request.error.value?.message).toBe('offline')
  })

  it('does not let a request answered after reset repopulate the state', async () => {
    const held = heldGets()
    let request!: UseHttpResult<string>

    mountComposable(
      () => {
        request = useHttp<string>('GET', '/api/tags')
      },
      { http: held.client },
    )

    void request.execute()
    request.reset()
    await held.answer(0, 'late')
    expect(request.data.value).toBeNull()
    expect(request.loading.value).toBe(false)
    expect(request.error.value).toBeNull()
  })

  it('still shows a single request answered in order', async () => {
    const held = heldGets()
    let request!: UseHttpResult<string>

    mountComposable(
      () => {
        request = useHttp<string>('GET', '/api/tags')
      },
      { http: held.client },
    )

    void request.execute()
    expect(request.loading.value).toBe(true)
    await held.answer(0, 'only')
    expect(request.data.value).toBe('only')
    expect(request.loading.value).toBe(false)
    expect(request.error.value).toBeNull()
  })

  it('returns each request outcome while only the newest request owns state', async () => {
    const held = heldGets()
    const onError = vi.fn()
    let request!: UseHttpResult<string>

    mountComposable(
      () => {
        request = useHttp<string>('GET', '/api/tags', () => ({ onError }))
      },
      { http: held.client },
    )

    let older!: Promise<string | null>
    let newer!: Promise<string | null>
    older = request.execute()
    newer = request.execute()
    await held.answer(1, 'newer')
    await expect(newer).resolves.toBe('newer')
    const error = new Error('older request failed')
    await held.fail(0, error)
    await expect(older).resolves.toBeNull()
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
    expect(request.data.value).toBe('newer')
    expect(request.loading.value).toBe(false)
    expect(request.error.value).toBeNull()

    older = request.execute()
    newer = request.execute()
    await held.answer(3, 'latest')
    await held.answer(2, 'superseded')
    await expect(older).resolves.toBe('superseded')
    await expect(newer).resolves.toBe('latest')
    expect(request.data.value).toBe('latest')
  })

  it('keeps each submit callback even when a newer submit owns state', async () => {
    const held = heldGets()
    held.client.post.mockImplementation((_url, _data, config) =>
      held.client.get('/api/items', config),
    )
    const navigate = vi.fn()
    let request!: UseHttpResult<string>

    mountComposable(
      () => {
        request = useHttp<string>('POST', '/api/items', () => ({ onSuccess: navigate }))
      },
      { http: held.client },
    )

    void request.execute()
    void request.execute()
    await held.answer(1, 'second receipt')
    await held.answer(0, 'first receipt')
    expect(navigate.mock.calls).toEqual([['second receipt'], ['first receipt']])
    expect(request.data.value).toBe('second receipt')
  })

  it.each(['success', 'failure'] as const)(
    'reset supersedes a late %s without cancelling its callback or return value',
    async (outcome) => {
      const held = heldGets()
      const onSuccess = vi.fn()
      const onError = vi.fn()
      let request!: UseHttpResult<string>

      mountComposable(
        () => {
          request = useHttp<string>('GET', '/api/tags', () => ({ onSuccess, onError }))
        },
        { http: held.client },
      )

      const pending = request.execute()
      request.reset()
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
      expect(request.data.value).toBeNull()
      expect(request.loading.value).toBe(false)
      expect(request.error.value).toBeNull()
      void request.execute()
      await held.answer(1, 'after reset')
      expect(request.data.value).toBe('after reset')
      expect(request.loading.value).toBe(false)
      expect(request.error.value).toBeNull()
    },
  )

  it.each(['success', 'failure'] as const)(
    'suppresses callbacks after unmount on %s while preserving the request return value',
    async (outcome) => {
      const held = heldGets()
      const onSuccess = vi.fn()
      const onError = vi.fn()
      let request!: UseHttpResult<string>

      const wrapper = mountComposable(
        () => {
          request = useHttp<string>('GET', '/api/tags', () => ({ onSuccess, onError }))
        },
        { http: held.client },
      )

      const execute = request.execute
      const pending = execute()
      wrapper.unmount()
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

  it('shows the newest immediate request when StrictMode replays the mount effect', async () => {
    const held = heldGets()
    const onSuccess = vi.fn()
    let request!: UseHttpResult<string>

    const Consumer = defineComponent({
      setup() {
        request = useHttp<string>('GET', '/api/tags', () => ({ immediate: true, onSuccess }))
        // Vue never replays a mount effect, so a host replaying the mount's
        // request is what this reproduces on the same instance.
        onMounted(() => {
          void request.execute()
        })
        return () => h('span')
      },
    })

    const wrapper = mount(Consumer, {
      global: { plugins: [[moleculePlugin, { http: held.client }]] },
    })
    mounted.push(wrapper)

    expect(held.client.get).toHaveBeenCalledTimes(2)
    await held.answer(1, 'current mount')
    await held.answer(0, 'replayed mount')
    expect(request.data.value).toBe('current mount')
    expect(request.loading.value).toBe(false)
    expect(request.error.value).toBeNull()
    expect(onSuccess.mock.calls).toEqual([['current mount'], ['replayed mount']])
  })
})

describe('useStorageValue', () => {
  it('should load and set storage value', async () => {
    const storageProvider = createMockStorageProvider()
    let storage!: ReturnType<typeof useStorageValue<string>>

    mountComposable(
      () => {
        storage = useStorageValue<string>('theme', { defaultValue: 'light' })
      },
      { storage: storageProvider },
    )

    // Wait for initial load
    await vi.waitFor(() => {
      expect(storage.loading.value).toBe(false)
    })

    expect(storage.value.value).toBe('light')

    await storage.setValue('dark')

    expect(storage.value.value).toBe('dark')
  })
})

describe('useLogger', () => {
  it('should return a logger instance', () => {
    const loggerProvider = createMockLoggerProvider()
    let logger!: ReturnType<typeof useLogger>

    mountComposable(
      () => {
        logger = useLogger('TestComponent')
      },
      { logger: loggerProvider },
    )

    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')

    logger.info('test message')
    expect(loggerProvider.getLogger().info).toHaveBeenCalled()
  })
})

describe('Provider errors', () => {
  // The composable is HANDED its store, so it must work with no provider at all
  // (X1 flash-m100): an app that made its store with a provider package's own
  // `createStoreWithActions()` — never calling `setProvider()` — had every page
  // throw "useStateProvider must be used within a StateProvider" on mount, from
  // a composable that only ever calls `store.getState()` / `store.subscribe()`.
  it('should render useStore(store) with no StateProvider anywhere', async () => {
    const store = createMockStore({ count: 0 })
    let selected!: ReturnType<typeof useStore<{ count: number }, number>>

    mountComposable(() => {
      selected = useStore(store, { selector: (s) => s.count })
    })

    expect(selected.value).toBe(0)

    store.setState({ count: 1 })
    await nextTick()
    expect(selected.value).toBe(1)
  })

  it('should name the fix when useStateProvider is used outside StateProvider', () => {
    let thrown: Error | undefined
    try {
      mountComposable(() => {
        useStateProvider()
      })
    } catch (error) {
      thrown = error instanceof Error ? error : new Error(String(error))
    }

    expect(thrown?.message).toContain('useStateProvider must be used within a StateProvider')
    // The message has to carry the fix, not just the diagnosis: the import line,
    // the plugin call that supplies the provider, and the composable to reach
    // for when the caller already holds a store.
    expect(thrown?.message).toContain("import { moleculePlugin } from '@molecule/app-vue'")
    expect(thrown?.message).toContain('setProvider(provider)')
    expect(thrown?.message).toContain('useStore(store)')
  })

  it('should throw when useAuth is used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let thrown: Error | undefined
    try {
      mountComposable(() => {
        useAuth()
      })
    } catch (error) {
      thrown = error instanceof Error ? error : new Error(String(error))
    }

    expect(thrown?.message).toContain('useAuthClient must be used within an AuthProvider')
    consoleError.mockRestore()
    consoleWarn.mockRestore()
  })
})
