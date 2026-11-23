// @vitest-environment jsdom

/**
 * The framework-binding contract React's `hooks.test.tsx` pins, run against the
 * Angular functions. Every title is the React test's; only the framework-forced
 * mechanics change: a function runs in an injection context (a component field
 * initializer) instead of a hook, signals replace the returned values, a
 * mounted component replaces a render, and each React-only mechanism is
 * translated where its case says so.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type EnvironmentProviders,
  Input,
  type OnChanges,
  type OnInit,
  type Provider,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthResult, AuthSessionSeed, AuthState } from '@molecule/app-auth'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
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
} from '../hooks/index.js'
import { provideMolecule } from '../providers.js'

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

/** A mock auth client with a mutable session state, so a test can publish a change. */
interface MockAuthClient<T> extends AuthClient<T> {
  /**
   * Publishes a new session status to every subscriber.
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
 * Builds a complete response body.
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
 * Creates a mock HTTP client for testing. `get` answers `{ id: 1 }` and `post`
 * answers `{ id: 1 }` with a 201; every method is a spy a test can steer.
 *
 * @returns A mock HTTP client instance.
 */
function createMockHttpClient(): HttpClient {
  const client: HttpClient = {
    baseURL: '',
    defaultHeaders: {},
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    setAuthToken: vi.fn(),
    getAuthToken: () => null,
    onAuthError: () => () => {},
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
  }
  vi.mocked(client.get).mockImplementation(async () => okResponse({ id: 1 }))
  vi.mocked(client.post).mockImplementation(async () => ({
    ...okResponse({ id: 1 }),
    status: 201,
    statusText: 'Created',
  }))
  vi.mocked(client.put).mockImplementation(async () => okResponse({ id: 1 }))
  vi.mocked(client.patch).mockImplementation(async () => okResponse({ id: 1 }))
  vi.mocked(client.delete).mockImplementation(async () => okResponse(null))
  return client
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
    trace: vi.fn((_message: string) => {}),
    debug: vi.fn((_message: string) => {}),
    info: vi.fn((_message: string) => {}),
    warn: vi.fn((_message: string) => {}),
    error: vi.fn((_message: string | Error) => {}),
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

/**
 * Mounts one probe component under the given providers and renders it once.
 *
 * @param component - The probe component class.
 * @param providers - The providers the probe injects (usually `provideMolecule`).
 * @returns The mounted fixture.
 */
function mount<P>(
  component: Type<P>,
  ...providers: (Provider | EnvironmentProviders)[]
): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), ...providers],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * Lets pending promises land.
 */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Lets pending promises land, then renders one change detection.
 *
 * @param fixture - The mounted probe.
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await flush()
  fixture.detectChanges()
}

/** A GET whose answers the test releases by hand, in any order. */
interface HeldGets {
  readonly client: HttpClient
  readonly answer: (index: number, data: unknown) => Promise<void>
  readonly fail: (index: number, error: Error) => Promise<void>
}

/**
 * A GET whose answers the test releases by hand, in any order.
 *
 * @returns The client and the two ways to settle one held request.
 */
function heldGets(): HeldGets {
  const client = createMockHttpClient()
  const pending: Array<{
    resolve: (response: HttpResponse<unknown>) => void
    reject: (error: Error) => void
  }> = []
  vi.mocked(client.get).mockImplementation(
    () =>
      new Promise<HttpResponse<unknown>>((resolve, reject) => {
        pending.push({ resolve, reject })
      }),
  )
  return {
    client,
    answer: async (index, data) => {
      pending[index].resolve(okResponse(data))
      await flush()
    },
    fail: async (index, error) => {
      pending[index].reject(error)
      await flush()
    },
  }
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('useStore', () => {
  it('should return current state from store', () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()

    /** Reads the whole store state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-store-probe',
      template: '',
    })
    class StoreProbeComponent {
      readonly state = useStore(store)
    }

    const fixture = mount(StoreProbeComponent, provideMolecule({ state: stateProvider }))

    expect(fixture.componentInstance.state()).toEqual({ count: 0 })
  })

  it('should update when store state changes', () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()

    /** Reads the whole store state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-store-update-probe',
      template: '',
    })
    class StoreUpdateProbeComponent {
      readonly state = useStore(store)
    }

    const fixture = mount(StoreUpdateProbeComponent, provideMolecule({ state: stateProvider }))

    expect(fixture.componentInstance.state().count).toBe(0)

    store.setState({ count: 5 })

    expect(fixture.componentInstance.state().count).toBe(5)
  })

  it('should support selector option', () => {
    const store = createMockStore({ count: 10, name: 'test' })
    const stateProvider = createMockStateProvider()

    /** Selects a derived value from the store. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-store-selector-probe',
      template: '',
    })
    class StoreSelectorProbeComponent {
      readonly selected = useStore(store, { selector: (state) => state.count * 2 })
    }

    const fixture = mount(StoreSelectorProbeComponent, provideMolecule({ state: stateProvider }))

    expect(fixture.componentInstance.selected()).toBe(20)
  })
})

describe('useAuth', () => {
  it('should return auth state', () => {
    const authClient = createMockAuthClient<{ id: string }>()

    /** Reads the auth state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-auth-probe',
      template: '',
    })
    class AuthProbeComponent {
      readonly auth = useAuth<{ id: string }>()
    }

    const fixture = mount(AuthProbeComponent, provideMolecule({ auth: authClient }))

    expect(fixture.componentInstance.auth.isAuthenticated()).toBe(false)
    expect(fixture.componentInstance.auth.user()).toBeNull()
  })

  it('should login and update state', async () => {
    const authClient = createMockAuthClient<{ id: string; email: string }>({
      loginUser: { id: '1', email: 'test@example.com' },
    })

    /** Reads the auth state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-auth-login-probe',
      template: '',
    })
    class AuthLoginProbeComponent {
      readonly auth = useAuth<{ id: string; email: string }>()
    }

    const fixture = mount(AuthLoginProbeComponent, provideMolecule({ auth: authClient }))

    await fixture.componentInstance.auth.login({ email: 'test@example.com', password: 'password' })

    expect(fixture.componentInstance.auth.isAuthenticated()).toBe(true)
    expect(fixture.componentInstance.auth.user()?.email).toBe('test@example.com')
  })

  it('re-renders when only the status changes', () => {
    // xr-molecule-flash-m173's cache: the snapshot compared the user and the flags but not
    // `status`, so a session check that reported 'unavailable' with the SAME user kept rendering
    // the old status — a state change the function silently dropped.
    const authClient = createMockAuthClient<{ id: string }>({ status: 'loading' })

    /** Reads the auth state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-auth-status-probe',
      template: '',
    })
    class AuthStatusProbeComponent {
      readonly auth = useAuth<{ id: string }>()
    }

    const fixture = mount(AuthStatusProbeComponent, provideMolecule({ auth: authClient }))

    expect(fixture.componentInstance.auth.state().status).toBe('loading')
    // `status` is also exposed at the top level: it is the ONE value a route guard
    // or a page renders the session from, so it must not be reachable only through
    // `state` (xr-molecule-flash-m177).
    expect(fixture.componentInstance.auth.status()).toBe('loading')

    authClient.setStatus('unavailable')

    expect(fixture.componentInstance.auth.state().status).toBe('unavailable')
    expect(fixture.componentInstance.auth.status()).toBe('unavailable')
  })
})

describe('useTheme', () => {
  it('should return current theme', () => {
    const themeProvider = createMockThemeProvider()

    /** Reads the theme state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-theme-probe',
      template: '',
    })
    class ThemeProbeComponent {
      readonly theme = useTheme()
    }

    const fixture = mount(ThemeProbeComponent, provideMolecule({ theme: themeProvider }))

    expect(fixture.componentInstance.theme.themeName()).toBe('light')
    expect(fixture.componentInstance.theme.mode()).toBe('light')
  })

  it('should toggle theme via the provider toggleMode method', () => {
    const themeProvider = createMockThemeProvider()
    const toggleModeSpy = vi.spyOn(themeProvider, 'toggleMode')

    /** Reads the theme state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-theme-toggle-probe',
      template: '',
    })
    class ThemeToggleProbeComponent {
      readonly theme = useTheme()
    }

    const fixture = mount(ThemeToggleProbeComponent, provideMolecule({ theme: themeProvider }))

    fixture.componentInstance.theme.toggleTheme()

    // `toggleTheme` must delegate to the provider's purpose-built
    // `toggleMode()` rather than index-cycling `getThemes()`.
    expect(toggleModeSpy).toHaveBeenCalledOnce()
    expect(fixture.componentInstance.theme.themeName()).toBe('dark')
  })

  it('falls back to cycling getThemes() when the provider has no toggleMode', () => {
    let currentThemeName = 'light'
    const listeners = new Set<() => void>()
    // A non-conforming provider that predates `toggleMode` — `toggleTheme`
    // must still work by cycling the registered themes.
    const legacyProvider: ThemeProvider & {
      getThemeName: () => string
      onThemeChange: (listener: () => void) => () => void
    } = Object.assign(createMockThemeProvider(), {
      getThemeName: (): string => currentThemeName,
      onThemeChange: (listener: () => void): (() => void) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    })
    legacyProvider.setTheme = (theme: Theme | string): void => {
      currentThemeName = typeof theme === 'string' ? theme : theme.name
      listeners.forEach((listener) => listener())
    }
    // The legacy provider predates `toggleMode` and `subscribe`; removing them
    // at runtime is exactly the provider this fallback exists for.
    Reflect.deleteProperty(legacyProvider, 'toggleMode')
    Reflect.deleteProperty(legacyProvider, 'subscribe')

    /** Reads the theme state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-theme-legacy-probe',
      template: '',
    })
    class ThemeLegacyProbeComponent {
      readonly theme = useTheme()
    }

    const fixture = mount(ThemeLegacyProbeComponent, provideMolecule({ theme: legacyProvider }))

    fixture.componentInstance.theme.toggleTheme()

    expect(fixture.componentInstance.theme.themeName()).toBe('dark')
  })

  // A static site prerenders on a server that reads no storage and no OS
  // preference, then hydrates in a browser that reads both. The function must
  // render the server's theme while hydrating — the markup it was sent — and
  // switch afterwards, or the client's first render disagrees with the server's
  // markup and hydration throws that markup away.
  it('hydrates with the server theme, then switches to the live one, without a mismatch', async () => {
    const light = lightTheme
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

    /** Renders the mode and name React's hydration probe renders. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-theme-mode-probe',
      template: `<span [attr.data-mode]="theme.mode()"
        >{{ theme.mode() }}{{ theme.themeName() }}</span
      >`,
    })
    class ThemeModeProbeComponent {
      readonly theme = useTheme()
    }

    // The server's render: the markup was built from the server theme.
    TestBed.configureTestingModule({
      imports: [ThemeModeProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ theme: serverProvider })],
    })
    const serverFixture = TestBed.createComponent(ThemeModeProbeComponent)
    serverFixture.detectChanges()
    expect(serverFixture.nativeElement.querySelector('span').getAttribute('data-mode')).toBe(
      'light',
    )

    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      imports: [ThemeModeProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ theme: clientProvider })],
    })
    const clientFixture = TestBed.createComponent(ThemeModeProbeComponent)
    // The hydrating client's FIRST read is the theme the server sent, so its
    // first render matches the markup before any change detection renders it.
    expect(clientFixture.componentInstance.theme.themeName()).toBe('light')
    clientFixture.detectChanges()
    await settle(clientFixture)
    expect(clientFixture.nativeElement.querySelector('span').getAttribute('data-mode')).toBe('dark')
    expect(clientFixture.nativeElement.querySelector('span').textContent).toBe('darkdark')
  })
})

describe('useRouter', () => {
  it('should return current location', () => {
    const router = createMockRouter()

    /** Reads the router state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-router-probe',
      template: '',
    })
    class RouterProbeComponent {
      readonly routing = useRouter()
    }

    const fixture = mount(RouterProbeComponent, provideMolecule({ router }))

    expect(fixture.componentInstance.routing.location().pathname).toBe('/')
  })

  it('should navigate to new path', () => {
    const router = createMockRouter()

    /** Reads the router state. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-router-navigate-probe',
      template: '',
    })
    class RouterNavigateProbeComponent {
      readonly routing = useRouter()
    }

    const fixture = mount(RouterNavigateProbeComponent, provideMolecule({ router }))

    fixture.componentInstance.routing.navigate('/dashboard')

    expect(fixture.componentInstance.routing.location().pathname).toBe('/dashboard')
  })
})

describe('useHttp', () => {
  it('publishes committed options before a child layout effect calls the action', async () => {
    const httpClient = createMockHttpClient()

    /** Calls the parent's action whenever its inputs change, like React's child layout effect. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-child-probe',
      template: '<span>{{ token }}</span>',
    })
    class HttpChildProbeComponent implements OnChanges {
      @Input() token = ''
      @Input() execute: () => Promise<unknown> = async () => null

      ngOnChanges(): void {
        void this.execute()
      }
    }

    /** Reads a request whose options follow the token signal. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-parent-probe',
      imports: [HttpChildProbeComponent],
      template: '<app-test-http-child-probe [token]="token()" [execute]="request.execute" />',
    })
    class HttpParentProbeComponent {
      readonly token = signal('first')
      readonly request = useHttp(
        'GET',
        '/api/test',
        computed(() => ({
          headers: { 'X-Selection': this.token() },
        })),
      )
    }

    const fixture = mount(HttpParentProbeComponent, provideMolecule({ http: httpClient }))
    await settle(fixture)
    vi.mocked(httpClient.get).mockClear()

    fixture.componentInstance.token.set('second')
    fixture.detectChanges()
    await settle(fixture)

    expect(vi.mocked(httpClient.get).mock.calls).toHaveLength(1)
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', {
      headers: { 'X-Selection': 'second' },
    })
  })

  it('keeps a committed action on committed options while a new render suspends', async () => {
    const httpClient = createMockHttpClient()

    /** Holds the action a committed tree handed down. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-captured-probe',
      template: '',
    })
    class HttpCapturedProbeComponent {
      readonly token = signal('committed')
      readonly request = useHttp<{ id: number }>(
        'GET',
        '/api/test',
        computed(() => ({
          headers: { 'X-Selection': this.token() },
        })),
      )
    }

    const fixture = mount(HttpCapturedProbeComponent, provideMolecule({ http: httpClient }))
    const execute = fixture.componentInstance.request.execute

    // Angular has no discarded render: a changed argument IS the committed one,
    // so the already-captured action sends it rather than its call-time value.
    fixture.componentInstance.token.set('pending')
    await execute()

    expect(httpClient.get).toHaveBeenCalledWith('/api/test', {
      headers: { 'X-Selection': 'pending' },
    })
  })

  it('keeps execute stable across ordinary rerenders', () => {
    const httpClient = createMockHttpClient()

    /** Reads a request whose options follow the nonce signal. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-stable-probe',
      template: '',
    })
    class HttpStableProbeComponent {
      readonly nonce = signal(0)
      readonly request = useHttp(
        'GET',
        '/api/test',
        computed(() => ({
          headers: { 'X-Nonce': String(this.nonce()) },
        })),
      )
    }

    const fixture = mount(HttpStableProbeComponent, provideMolecule({ http: httpClient }))
    const execute = fixture.componentInstance.request.execute

    fixture.componentInstance.nonce.set(1)
    fixture.detectChanges()

    expect(fixture.componentInstance.request.execute).toBe(execute)
  })

  it('keeps execute stable through its own state updates and inline options', async () => {
    const httpClient = createMockHttpClient()

    /** Reads a request whose options are rebuilt from the nonce signal. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-inline-probe',
      template: '',
    })
    class HttpInlineProbeComponent {
      readonly nonce = signal(0)
      readonly request = useHttp<{ id: number }>(
        'GET',
        '/api/test',
        computed(() => ({
          // Rebuilt on every read, like an inline config in a component.
          headers: { 'X-Nonce': String(this.nonce()) },
          onSuccess: () => {},
        })),
      )
    }

    const fixture = mount(HttpInlineProbeComponent, provideMolecule({ http: httpClient }))
    const request = fixture.componentInstance.request
    const execute = request.execute

    // The function's own loading → data updates rerender the view.
    await request.execute()
    expect(request.data()).toEqual({ id: 1 })
    expect(request.execute).toBe(execute)

    // An ordinary parent rerender must not replace the action either.
    fixture.componentInstance.nonce.set(1)
    fixture.detectChanges()
    expect(request.execute).toBe(execute)
  })

  it('runs exactly one request from an effect that depends on execute', async () => {
    const httpClient = createMockHttpClient()
    const successes: string[] = []

    /** Runs its load work once, bounded so a replaced action fails rather than spins. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-consumer-probe',
      template: '<p>{{ line() }}</p>',
    })
    class HttpConsumerProbeComponent implements OnInit {
      private attempts = 0
      readonly request = useHttp<{ id: number }>(
        'GET',
        '/api/test',
        computed(() => ({
          onSuccess: () => {
            successes.push('success')
          },
        })),
      )

      ngOnInit(): void {
        // Bounded fixture: work that re-fires because `execute` changed must
        // FAIL the call-count assertion, never spin the runner.
        if (this.attempts >= 3) return
        this.attempts += 1
        void this.request.execute()
      }

      /**
       * The loading or loaded line the view shows.
       *
       * @returns The rendered line.
       */
      line(): string {
        return this.request.loading() ? 'loading' : `id:${this.request.data()?.id ?? 'none'}`
      }
    }

    const fixture = mount(HttpConsumerProbeComponent, provideMolecule({ http: httpClient }))

    await vi.waitFor(() => expect(fixture.nativeElement.textContent).toBe('id:1'))

    // A rerender after the request settled must not re-run the load work.
    fixture.detectChanges()
    await flush()
    fixture.detectChanges()

    expect(vi.mocked(httpClient.get).mock.calls).toHaveLength(1)
    expect(successes).toEqual(['success'])
    expect(fixture.nativeElement.textContent).toBe('id:1')
  })

  it('sends the current options and callback on a later manual call', async () => {
    const httpClient = createMockHttpClient()
    const firstSuccess = vi.fn()
    const secondSuccess = vi.fn()

    /** Reads a POST whose options and callback follow signals. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-later-probe',
      template: '',
    })
    class HttpLaterProbeComponent {
      readonly version = signal('one')
      readonly callback = signal<(data: { id: number }) => void>(firstSuccess)
      readonly request = useHttp<{ id: number }>(
        'POST',
        '/api/items',
        computed(() => ({
          headers: { 'X-Version': this.version() },
          data: { name: 'widget' },
          onSuccess: this.callback(),
        })),
      )
    }

    const fixture = mount(HttpLaterProbeComponent, provideMolecule({ http: httpClient }))
    const request = fixture.componentInstance.request
    const execute = request.execute

    fixture.componentInstance.version.set('two')
    fixture.componentInstance.callback.set(secondSuccess)
    fixture.detectChanges()
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
    // Angular's client comes from the injector, which a live component cannot
    // replace; a dispatching client whose target is a signal is the
    // caller-observable equivalent of React's provider re-render.
    const active = signal<HttpClient>(firstClient)
    const switching: HttpClient = {
      baseURL: '',
      defaultHeaders: {},
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
      setAuthToken: vi.fn(),
      getAuthToken: () => null,
      onAuthError: () => () => {},
      addRequestInterceptor: () => () => {},
      addResponseInterceptor: () => () => {},
      addErrorInterceptor: () => () => {},
    }
    vi.mocked(switching.get).mockImplementation((url: string, config?: RequestConfig) =>
      active().get(url, config),
    )
    vi.mocked(switching.post).mockImplementation(
      (url: string, data?: unknown, config?: RequestConfig) => active().post(url, data, config),
    )
    vi.mocked(switching.put).mockImplementation(
      (url: string, data?: unknown, config?: RequestConfig) => active().put(url, data, config),
    )
    vi.mocked(switching.patch).mockImplementation(
      (url: string, data?: unknown, config?: RequestConfig) => active().patch(url, data, config),
    )
    vi.mocked(switching.delete).mockImplementation((url: string, config?: RequestConfig) =>
      active().delete(url, config),
    )

    /** Reads a request whose method and url follow signals. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-switch-probe',
      template: '',
    })
    class HttpSwitchProbeComponent {
      readonly method = signal<'GET' | 'DELETE'>('GET')
      readonly url = signal('/api/one')
      readonly request = useHttp<{ id: number }>(this.method, this.url)
    }

    const fixture = mount(HttpSwitchProbeComponent, provideMolecule({ http: switching }))
    const request = fixture.componentInstance.request

    await request.execute()
    expect(firstClient.get).toHaveBeenCalledWith('/api/one', expect.any(Object))

    fixture.componentInstance.method.set('DELETE')
    fixture.componentInstance.url.set('/api/two')
    active.set(secondClient)
    fixture.detectChanges()

    await request.execute()
    expect(secondClient.delete).toHaveBeenCalledWith('/api/two', expect.any(Object))
    expect(secondClient.get).not.toHaveBeenCalled()
    expect(firstClient.get).toHaveBeenCalledTimes(1)
    expect(firstClient.delete).not.toHaveBeenCalled()
  })

  it('reports a failure through state and onError', async () => {
    const httpClient = createMockHttpClient()
    vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('nope'))
    const onError = vi.fn()

    /** Reads a request that fails. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-failure-probe',
      template: '',
    })
    class HttpFailureProbeComponent {
      readonly request = useHttp('GET', '/api/test', { onError })
    }

    const fixture = mount(HttpFailureProbeComponent, provideMolecule({ http: httpClient }))
    const request = fixture.componentInstance.request

    await request.execute()

    expect(request.data()).toBeNull()
    expect(request.loading()).toBe(false)
    expect(request.error()?.message).toBe('nope')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('does not deliver a response to an unmounted hook', async () => {
    const httpClient = createMockHttpClient()
    const onSuccess = vi.fn()
    const deferred: { resolve?: (response: HttpResponse<unknown>) => void } = {}
    vi.mocked(httpClient.get).mockImplementationOnce(
      () =>
        new Promise<HttpResponse<unknown>>((resolve) => {
          deferred.resolve = resolve
        }),
    )

    /** Reads a request whose response outlives the view. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-unmounted-probe',
      template: '',
    })
    class HttpUnmountedProbeComponent {
      readonly request = useHttp<{ id: number }>('GET', '/api/test', { onSuccess })
    }

    const fixture = mount(HttpUnmountedProbeComponent, provideMolecule({ http: httpClient }))
    const request = fixture.componentInstance.request

    const pending = request.execute()
    fixture.destroy()

    deferred.resolve?.(okResponse({ id: 7 }))
    await pending

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('resets state without replacing execute', async () => {
    const httpClient = createMockHttpClient()

    /** Reads a request with the reset control. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-reset-probe',
      template: '',
    })
    class HttpResetProbeComponent {
      readonly request = useHttp<{ id: number }>('GET', '/api/test')
    }

    const fixture = mount(HttpResetProbeComponent, provideMolecule({ http: httpClient }))
    const request = fixture.componentInstance.request
    const execute = request.execute

    await request.execute()
    expect(request.data()).toEqual({ id: 1 })

    request.reset()

    expect(request.data()).toBeNull()
    expect(request.loading()).toBe(false)
    expect(request.error()).toBeNull()
    expect(request.execute).toBe(execute)
  })

  it('stays finite when StrictMode runs the consumer effect twice', async () => {
    const httpClient = createMockHttpClient()

    /** Runs its load work once, bounded so a replaced action fails rather than spins. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-finite-probe',
      template: '<p>{{ line() }}</p>',
    })
    class HttpFiniteProbeComponent implements OnInit {
      private attempts = 0
      readonly request = useHttp<{ id: number }>('GET', '/api/test')

      ngOnInit(): void {
        // React's StrictMode runs a mount effect twice; a THIRD run means
        // execute was replaced. The cap keeps that regression a failed
        // assertion, not a spin.
        if (this.attempts >= 3) return
        this.attempts += 1
        void this.request.execute()
      }

      /**
       * The loaded line the view shows.
       *
       * @returns The rendered line.
       */
      line(): string {
        return this.request.data() ? `id:${this.request.data()?.id ?? 'none'}` : 'id:none'
      }
    }

    const fixture = mount(HttpFiniteProbeComponent, provideMolecule({ http: httpClient }))

    await vi.waitFor(() => expect(fixture.nativeElement.textContent).toBe('id:1'))
    await flush()
    fixture.detectChanges()

    // Angular renders the component once (React's StrictMode runs two), never a
    // chain of mounts.
    expect(vi.mocked(httpClient.get).mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(vi.mocked(httpClient.get).mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('should make GET request', async () => {
    const httpClient = createMockHttpClient()

    /** Reads a GET request. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-get-probe',
      template: '',
    })
    class HttpGetProbeComponent {
      readonly request = useHttp<{ id: number }>('GET', '/api/test')
    }

    const fixture = mount(HttpGetProbeComponent, provideMolecule({ http: httpClient }))
    const request = fixture.componentInstance.request

    expect(request.loading()).toBe(false)
    expect(request.data()).toBeNull()

    await request.execute()

    expect(request.data()).toEqual({ id: 1 })
    expect(httpClient.get).toHaveBeenCalledWith('/api/test', expect.any(Object))
  })

  it('shows the newest request when an older one answers after it', async () => {
    const held = heldGets()
    const seen: unknown[] = []

    /** Reads a request with a success callback. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-newest-probe',
      template: '',
    })
    class HttpNewestProbeComponent {
      readonly request = useHttp<string>('GET', '/api/tags', {
        onSuccess: (data) => seen.push(data),
      })
    }

    const fixture = mount(HttpNewestProbeComponent, provideMolecule({ http: held.client }))
    const request = fixture.componentInstance.request

    void request.execute()
    void request.execute()
    await held.answer(1, 'newer')
    expect(request.data()).toBe('newer')
    expect(request.loading()).toBe(false)
    // The first load answers late: it must not replace what the newer one showed.
    await held.answer(0, 'older')
    expect(request.data()).toBe('newer')
    // Each request still reports its own outcome to its callback.
    expect(seen).toEqual(['newer', 'older'])
  })

  it('keeps loading while a newer request is in flight after an older one answers', async () => {
    const held = heldGets()

    /** Reads a request. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-inflight-probe',
      template: '',
    })
    class HttpInFlightProbeComponent {
      readonly request = useHttp<string>('GET', '/api/tags')
    }

    const fixture = mount(HttpInFlightProbeComponent, provideMolecule({ http: held.client }))
    const request = fixture.componentInstance.request

    void request.execute()
    void request.execute()
    await held.answer(0, 'older')
    expect(request.loading()).toBe(true)
    expect(request.data()).toBeNull()
    await held.fail(1, new Error('offline'))
    expect(request.loading()).toBe(false)
    expect(request.error()?.message).toBe('offline')
  })

  it('does not let a request answered after reset repopulate the state', async () => {
    const held = heldGets()

    /** Reads a request with the reset control. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-late-reset-probe',
      template: '',
    })
    class HttpLateResetProbeComponent {
      readonly request = useHttp<string>('GET', '/api/tags')
    }

    const fixture = mount(HttpLateResetProbeComponent, provideMolecule({ http: held.client }))
    const request = fixture.componentInstance.request

    void request.execute()
    request.reset()
    await held.answer(0, 'late')

    expect(request.data()).toBeNull()
    expect(request.loading()).toBe(false)
    expect(request.error()).toBeNull()
  })

  it('still shows a single request answered in order', async () => {
    const held = heldGets()

    /** Reads a request. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-single-probe',
      template: '',
    })
    class HttpSingleProbeComponent {
      readonly request = useHttp<string>('GET', '/api/tags')
    }

    const fixture = mount(HttpSingleProbeComponent, provideMolecule({ http: held.client }))
    const request = fixture.componentInstance.request

    void request.execute()
    expect(request.loading()).toBe(true)
    await held.answer(0, 'only')

    expect(request.data()).toBe('only')
    expect(request.loading()).toBe(false)
    expect(request.error()).toBeNull()
  })

  it('returns each request outcome while only the newest request owns state', async () => {
    const held = heldGets()
    const onError = vi.fn()

    /** Reads a request with an error callback. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-outcomes-probe',
      template: '',
    })
    class HttpOutcomesProbeComponent {
      readonly request = useHttp<string>('GET', '/api/tags', { onError })
    }

    const fixture = mount(HttpOutcomesProbeComponent, provideMolecule({ http: held.client }))
    const request = fixture.componentInstance.request

    const older = request.execute()
    const newer = request.execute()
    await held.answer(1, 'newer')
    await expect(newer).resolves.toBe('newer')
    const error = new Error('older request failed')
    await held.fail(0, error)
    await expect(older).resolves.toBeNull()
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
    expect(request.data()).toBe('newer')
    expect(request.loading()).toBe(false)
    expect(request.error()).toBeNull()

    const superseded = request.execute()
    const latest = request.execute()
    await held.answer(3, 'latest')
    await held.answer(2, 'superseded')
    await expect(superseded).resolves.toBe('superseded')
    await expect(latest).resolves.toBe('latest')
    expect(request.data()).toBe('latest')
  })

  it('keeps each submit callback even when a newer submit owns state', async () => {
    const held = heldGets()
    vi.mocked(held.client.post).mockImplementation((_url, _data, config?: RequestConfig) =>
      held.client.get('/api/items', config),
    )
    const navigate = vi.fn()

    /** Reads a POST with a success callback. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-submit-probe',
      template: '',
    })
    class HttpSubmitProbeComponent {
      readonly request = useHttp<string>('POST', '/api/items', { onSuccess: navigate })
    }

    const fixture = mount(HttpSubmitProbeComponent, provideMolecule({ http: held.client }))
    const request = fixture.componentInstance.request

    void request.execute()
    void request.execute()
    await held.answer(1, 'second receipt')
    await held.answer(0, 'first receipt')

    expect(navigate.mock.calls).toEqual([['second receipt'], ['first receipt']])
    expect(request.data()).toBe('second receipt')
  })

  it.each(['success', 'failure'] as const)(
    'reset supersedes a late %s without cancelling its callback or return value',
    async (outcome) => {
      const held = heldGets()
      const onSuccess = vi.fn()
      const onError = vi.fn()

      /** Reads a request with both callbacks and the reset control. */
      @Component({
        changeDetection: ChangeDetectionStrategy.Eager,
        selector: 'app-test-http-reset-late-probe',
        template: '',
      })
      class HttpResetLateProbeComponent {
        readonly request = useHttp<string>('GET', '/api/tags', { onSuccess, onError })
      }

      const fixture = mount(HttpResetLateProbeComponent, provideMolecule({ http: held.client }))
      const request = fixture.componentInstance.request

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
      expect(request.data()).toBeNull()
      expect(request.loading()).toBe(false)
      expect(request.error()).toBeNull()
      void request.execute()
      await held.answer(1, 'after reset')
      expect(request.data()).toBe('after reset')
      expect(request.loading()).toBe(false)
      expect(request.error()).toBeNull()
    },
  )

  it.each(['success', 'failure'] as const)(
    'suppresses callbacks after unmount on %s while preserving the request return value',
    async (outcome) => {
      const held = heldGets()
      const onSuccess = vi.fn()
      const onError = vi.fn()

      /** Reads a request whose answer outlives the view. */
      @Component({
        changeDetection: ChangeDetectionStrategy.Eager,
        selector: 'app-test-http-unmount-return-probe',
        template: '',
      })
      class HttpUnmountReturnProbeComponent {
        readonly request = useHttp<string>('GET', '/api/tags', { onSuccess, onError })
      }

      const fixture = mount(HttpUnmountReturnProbeComponent, provideMolecule({ http: held.client }))
      const request = fixture.componentInstance.request
      const execute = request.execute

      const pending = execute()
      fixture.destroy()
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

    /** Reads an immediate request. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-http-immediate-probe',
      template: '',
    })
    class HttpImmediateProbeComponent {
      readonly request = useHttp<string>('GET', '/api/tags', { immediate: true, onSuccess })
    }

    const fixture = mount(HttpImmediateProbeComponent, provideMolecule({ http: held.client }))
    const request = fixture.componentInstance.request

    // The immediate option issues its request once on mount, and Angular never
    // replays a mount effect: a host replaying the mount's request is what this
    // reproduces on the same instance.
    expect(vi.mocked(held.client.get).mock.calls).toHaveLength(1)
    void request.execute()
    expect(vi.mocked(held.client.get).mock.calls).toHaveLength(2)

    await held.answer(1, 'current mount')
    await held.answer(0, 'replayed mount')

    expect(request.data()).toBe('current mount')
    expect(request.loading()).toBe(false)
    expect(request.error()).toBeNull()
    expect(onSuccess.mock.calls).toEqual([['current mount'], ['replayed mount']])
  })
})

describe('useStorageValue', () => {
  it('should load and set storage value', async () => {
    const storageProvider = createMockStorageProvider()

    /** Reads one storage key. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-storage-probe',
      template: '',
    })
    class StorageProbeComponent {
      readonly storage = useStorageValue<string>('theme', { defaultValue: 'light' })
    }

    const fixture = mount(StorageProbeComponent, provideMolecule({ storage: storageProvider }))
    const storage = fixture.componentInstance.storage

    // Wait for initial load
    await vi.waitFor(() => {
      expect(storage.loading()).toBe(false)
    })

    expect(storage.value()).toBe('light')

    await storage.setValue('dark')

    expect(storage.value()).toBe('dark')
  })
})

describe('useLogger', () => {
  it('should return a logger instance', () => {
    const loggerProvider = createMockLoggerProvider()

    /** Reads a named logger. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-logger-probe',
      template: '',
    })
    class LoggerProbeComponent {
      readonly logger = useLogger('TestComponent')
    }

    const fixture = mount(LoggerProbeComponent, provideMolecule({ logger: loggerProvider }))
    const logger = fixture.componentInstance.logger

    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')

    logger.info('test message')
    expect(loggerProvider.getLogger().info).toHaveBeenCalled()
  })
})

describe('Provider errors', () => {
  // The function is HANDED its store, so it must work with no provider at all
  // (X1 flash-m100): an app that made its store with a provider package's own
  // `createStoreWithActions()` — never calling `setProvider()` — had every page
  // throw "useStateProvider must be used within a StateProvider" on mount, from
  // a function that only ever calls `store.getState()` / `store.subscribe()`.
  it('should render useStore(store) with no StateProvider anywhere', () => {
    const store = createMockStore({ count: 0 })

    /** Selects from a store handed to it directly. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-store-no-provider-probe',
      template: '',
    })
    class StoreNoProviderProbeComponent {
      readonly selected = useStore(store, { selector: (state) => state.count })
    }

    const fixture = mount(StoreNoProviderProbeComponent)

    expect(fixture.componentInstance.selected()).toBe(0)

    store.setState({ count: 1 })
    expect(fixture.componentInstance.selected()).toBe(1)
  })

  it('should name the fix when useStateProvider is used outside StateProvider', () => {
    /** Reads the state registration without one being registered. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-state-provider-error-probe',
      template: '',
    })
    class StateProviderErrorProbeComponent {
      readonly provider = useStateProvider()
    }

    let thrown: Error | undefined
    try {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
      TestBed.createComponent(StateProviderErrorProbeComponent)
    } catch (error) {
      thrown = error instanceof Error ? error : new Error(String(error))
    }

    expect(thrown?.message).toContain('useStateProvider must be used within a StateProvider')
    // The message has to carry the fix, not just the diagnosis: the import line,
    // the registration that supplies the provider by default, and the function
    // to reach for when the caller already holds a store.
    expect(thrown?.message).toContain("import { provideMolecule } from '@molecule/app-angular'")
    expect(thrown?.message).toContain('setProvider(provider)')
    expect(thrown?.message).toContain('useStore(store)')
  })

  it('should throw when useAuth is used outside AuthProvider', () => {
    /** Reads the auth client without one being registered. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-auth-provider-error-probe',
      template: '',
    })
    class AuthProviderErrorProbeComponent {
      readonly auth = useAuth()
    }

    let thrown: Error | undefined
    try {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
      TestBed.createComponent(AuthProviderErrorProbeComponent)
    } catch (error) {
      thrown = error instanceof Error ? error : new Error(String(error))
    }

    expect(thrown?.message).toContain('useAuthClient must be used within an AuthProvider')
  })
})
