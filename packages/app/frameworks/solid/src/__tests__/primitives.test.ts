import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { AuthClient, AuthEventListener, AuthState } from '@molecule/app-auth'
import type {
  ErrorInterceptor,
  FullRequestConfig,
  HttpClient,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
} from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { Logger, LoggerConfig, LoggerProvider, LogTransport } from '@molecule/app-logger'
import type {
  NavigationGuard,
  RouteChangeListener,
  RouteDefinition,
  Router,
} from '@molecule/app-routing'
import type { StateListener, StateProvider, Store } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'
import { createDarkTheme, createLightTheme } from '@molecule/app-theme'

/**
 * A `T` whose methods are `vi.fn` mocks carrying the method's REAL signature,
 * so the mock can be passed wherever `T` is expected while tests still assert
 * on the mocks (`mockReturnValue`, `toHaveBeenCalledWith`) with types checked.
 */
type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? Mock<(...args: Args) => Return>
    : T[K]
}

/**
 * A mock for a method that RETURNS its own type parameter (e.g.
 * `get<T>(url): Promise<HttpResponse<T>>`): no concrete stub can produce a
 * value of a free `T`, so the erased `Mock<(...args) => Return>` shape is not
 * assignable to the interface. The mock object therefore carries the
 * interface's OWN generic method as its type (joined with the `vi.fn`), and
 * behavior is attached through `mockResolvedValue`/`mockReturnValue`, whose
 * argument type is the erased (unknown) response.
 */
type GenericMethodMock<T, K extends keyof T> = T[K] extends (...args: never[]) => unknown
  ? Mock<T[K]> & T[K]
  : never

/**
 * Wraps a `vi.fn` so a mock object property carries its method's real generic
 * signature. The stand-in function is never invoked: `Object.assign` gives the
 * mock the method's type without a cast, and the `vi.fn` stays the runtime
 * target that records calls and returns the canned responses.
 */
const asMethod = <Method extends (...args: never[]) => unknown>(
  mock: Mock<Method>,
): Mock<Method> & Method =>
  Object.assign(mock, (): never => {
    throw new Error('generic method stand-in — calls are recorded by the vi.fn mock')
  })

// --- Mock solid-js ---
const contextValues = new Map<symbol, unknown>()
let effectCallbacks: (() => void)[] = []
let cleanupCallbacks: (() => void)[] = []
// Owner returned by the mocked getOwner() — null means "outside a component".
let currentOwner: unknown = null
let mountCallbacks: (() => void)[] = []

vi.mock('solid-js', () => {
  let contextIdCounter = 0

  return {
    createContext: vi.fn((defaultValue?: unknown) => {
      const id = Symbol(`context-${contextIdCounter++}`)
      return {
        id,
        defaultValue,
        Provider: vi.fn(({ value, children }: { value: unknown; children: unknown }) => {
          contextValues.set(id, value)
          return children
        }),
      }
    }),
    useContext: vi.fn((ctx: { id: symbol; defaultValue: unknown }) => {
      return contextValues.get(ctx.id) ?? ctx.defaultValue
    }),
    createSignal: vi.fn(<T>(initial: T) => {
      let value = initial
      const getter: (() => T) & { _type: string } = Object.assign(() => value, {
        _type: 'accessor',
      })
      const setter = (newValue: T | ((prev: T) => T)): void => {
        if (typeof newValue === 'function') {
          value = (newValue as (prev: T) => T)(value)
        } else {
          value = newValue
        }
      }
      return [getter, setter]
    }),
    createEffect: vi.fn((fn: () => void) => {
      effectCallbacks.push(fn)
      fn()
    }),
    onCleanup: vi.fn((fn: () => void) => {
      cleanupCallbacks.push(fn)
    }),
    createMemo: vi.fn((fn: () => unknown) => fn),
    getOwner: vi.fn(() => currentOwner),
    onMount: vi.fn((fn: () => void) => {
      mountCallbacks.push(fn)
      fn()
    }),
    createResource: vi.fn((_source: unknown, _fetcher: unknown) => {
      const resource: (() => undefined) & { loading: boolean; error: undefined } = Object.assign(
        () => undefined,
        { loading: false, error: undefined },
      )
      return [resource, {}]
    }),
  }
})

// Import context module first to establish contexts
import {
  AuthContext,
  HttpContext,
  I18nContext,
  LoggerContext,
  RouterContext,
  StateContext,
  StorageContext,
  ThemeContext,
} from '../context.js'

// --- Auth primitives tests ---

/** A full `AuthClient<unknown>` whose every method is a mock with its real signature. */
type MockAuthClient = Mocked<AuthClient<unknown>>

const createMockAuthClient = (): MockAuthClient => ({
  getState: vi.fn(() => ({
    status: 'loading',
    initialized: false,
    user: null,
    authenticated: false,
    loading: true,
    error: null,
  })),
  isAuthenticated: vi.fn(() => false),
  getUser: vi.fn(() => null),
  setUser: vi.fn(),
  getAccessToken: vi.fn(() => null),
  setAccessToken: vi.fn(),
  setSession: vi.fn(),
  getRefreshToken: vi.fn(() => null),
  getToken: vi.fn(() => null),
  login: vi.fn(() => Promise.resolve({ user: { name: 'Test' }, accessToken: 'abc' })),
  logout: vi.fn(() => Promise.resolve()),
  register: vi.fn(() => Promise.resolve({ user: { name: 'New' }, accessToken: 'def' })),
  refresh: vi.fn(() => Promise.resolve({ user: { name: 'Test' }, accessToken: 'abc' })),
  requestPasswordReset: vi.fn(() => Promise.resolve()),
  confirmPasswordReset: vi.fn(() => Promise.resolve()),
  updateProfile: vi.fn(() => Promise.resolve({ name: 'Test' })),
  changePassword: vi.fn(() => Promise.resolve()),
  initialize: vi.fn(() => Promise.resolve()),
  subscribe: vi.fn((_callback: (state: AuthState<unknown>) => void) => () => {}),
  onAuthChange: vi.fn((_callback: (state: AuthState<unknown>) => void) => () => {}),
  addEventListener: vi.fn((_listener: AuthEventListener<unknown>) => () => {}),
  destroy: vi.fn(),
})

describe('Auth primitives', () => {
  let mockAuthClient: MockAuthClient

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockAuthClient = createMockAuthClient()
    contextValues.set(AuthContext.id, mockAuthClient)
  })

  async function getAuthModule() {
    return await import('../primitives/auth.js')
  }

  it('createAuthFromClient returns all expected properties', async () => {
    const { createAuthFromClient } = await getAuthModule()
    const result = createAuthFromClient(mockAuthClient)

    expect(result).toHaveProperty('state')
    expect(result).toHaveProperty('user')
    expect(result).toHaveProperty('isAuthenticated')
    expect(result).toHaveProperty('isLoading')
    expect(result).toHaveProperty('login')
    expect(result).toHaveProperty('logout')
    expect(result).toHaveProperty('register')
    expect(result).toHaveProperty('refresh')
  })

  it('createAuthFromClient initializes from client state', async () => {
    const authedState: AuthState<unknown> = {
      status: 'authenticated',
      initialized: true,
      user: { name: 'Alice' },
      authenticated: true,
      loading: false,
      error: null,
    }
    mockAuthClient.getState.mockReturnValue(authedState)

    const { createAuthFromClient } = await getAuthModule()
    const result = createAuthFromClient(mockAuthClient)

    expect(result.state()).toEqual(authedState)
    expect(result.user()).toEqual({ name: 'Alice' })
    expect(result.isAuthenticated()).toBe(true)
    expect(result.isLoading()).toBe(false)
  })

  it('createAuthFromClient binds login to client', async () => {
    const { createAuthFromClient } = await getAuthModule()
    const result = createAuthFromClient(mockAuthClient)

    const creds = { email: 'test@example.com', password: '123' }
    await result.login(creds)
    expect(mockAuthClient.login).toHaveBeenCalledWith(creds)
  })

  it('createAuthFromClient binds logout to client', async () => {
    const { createAuthFromClient } = await getAuthModule()
    const result = createAuthFromClient(mockAuthClient)

    await result.logout()
    expect(mockAuthClient.logout).toHaveBeenCalled()
  })

  it('createAuthFromClient binds register to client', async () => {
    const { createAuthFromClient } = await getAuthModule()
    const result = createAuthFromClient(mockAuthClient)

    const data = { email: 'new@example.com', password: '123' }
    await result.register(data)
    expect(mockAuthClient.register).toHaveBeenCalledWith(data)
  })

  it('createAuthFromClient binds refresh to client', async () => {
    const { createAuthFromClient } = await getAuthModule()
    const result = createAuthFromClient(mockAuthClient)

    await result.refresh()
    expect(mockAuthClient.refresh).toHaveBeenCalled()
  })

  it('createAuthFromClient subscribes to auth changes', async () => {
    const { createAuthFromClient } = await getAuthModule()
    createAuthFromClient(mockAuthClient)

    expect(mockAuthClient.onAuthChange).toHaveBeenCalled()
  })

  it('createAuthHelpers returns helper functions that delegate to client', async () => {
    const { createAuthHelpers } = await getAuthModule()
    const helpers = createAuthHelpers()

    expect(helpers).toHaveProperty('login')
    expect(helpers).toHaveProperty('logout')
    expect(helpers).toHaveProperty('register')
    expect(helpers).toHaveProperty('refresh')
    expect(helpers).toHaveProperty('getUser')
    expect(helpers).toHaveProperty('getToken')
    expect(helpers).toHaveProperty('isAuthenticated')

    await helpers.login({ email: 'a@b.com', password: 'x' })
    expect(mockAuthClient.login).toHaveBeenCalled()

    await helpers.logout()
    expect(mockAuthClient.logout).toHaveBeenCalled()

    helpers.getUser()
    expect(mockAuthClient.getUser).toHaveBeenCalled()

    helpers.getToken()
    expect(mockAuthClient.getToken).toHaveBeenCalled()

    helpers.isAuthenticated()
    expect(mockAuthClient.isAuthenticated).toHaveBeenCalled()
  })
})

// --- HTTP primitives tests ---

/** A full `HttpResponse<T>` fixture — the tests' mock responses carry every field. */
const httpResponse = <T>(
  data: T,
  status = 200,
  method: FullRequestConfig['method'] = 'GET',
): HttpResponse<T> => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: { method, url: '/api/test' },
})

describe('HTTP primitives', () => {
  type MockHttpClient = Omit<
    Mocked<HttpClient>,
    'request' | 'get' | 'post' | 'put' | 'patch' | 'delete'
  > & {
    request: GenericMethodMock<HttpClient, 'request'>
    get: GenericMethodMock<HttpClient, 'get'>
    post: GenericMethodMock<HttpClient, 'post'>
    put: GenericMethodMock<HttpClient, 'put'>
    patch: GenericMethodMock<HttpClient, 'patch'>
    delete: GenericMethodMock<HttpClient, 'delete'>
  }

  let mockHttpClient: MockHttpClient

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockHttpClient = {
      baseURL: '/api',
      defaultHeaders: {},
      get: asMethod(vi.fn<HttpClient['get']>()),
      post: asMethod(vi.fn<HttpClient['post']>()),
      put: asMethod(vi.fn<HttpClient['put']>()),
      patch: asMethod(vi.fn<HttpClient['patch']>()),
      delete: asMethod(vi.fn<HttpClient['delete']>()),
      request: asMethod(vi.fn<HttpClient['request']>()),
      addRequestInterceptor: vi.fn((_interceptor: RequestInterceptor) => () => {}),
      addResponseInterceptor: vi.fn((_interceptor: ResponseInterceptor) => () => {}),
      addErrorInterceptor: vi.fn((_interceptor: ErrorInterceptor) => () => {}),
      setAuthToken: vi.fn(),
      getAuthToken: vi.fn(() => 'token123'),
      onAuthError: vi.fn((_handler: () => void) => () => {}),
    }
    mockHttpClient.get.mockResolvedValue(httpResponse({ items: [] }))
    mockHttpClient.post.mockResolvedValue(httpResponse({ id: '1' }, 201, 'POST'))
    mockHttpClient.put.mockResolvedValue(httpResponse({ updated: true }, 200, 'PUT'))
    mockHttpClient.patch.mockResolvedValue(httpResponse({ patched: true }, 200, 'PATCH'))
    mockHttpClient.delete.mockResolvedValue(httpResponse(null, 204, 'DELETE'))
    mockHttpClient.request.mockResolvedValue(httpResponse({}, 200, 'GET'))
    contextValues.set(HttpContext.id, mockHttpClient)
  })

  async function getHttpModule() {
    return await import('../primitives/http.js')
  }

  it('createHttpFromClient returns all HTTP method helpers', async () => {
    const { createHttpFromClient } = await getHttpModule()
    const http = createHttpFromClient(mockHttpClient)

    expect(http).toHaveProperty('get')
    expect(http).toHaveProperty('post')
    expect(http).toHaveProperty('put')
    expect(http).toHaveProperty('patch')
    expect(http).toHaveProperty('delete')
    expect(http).toHaveProperty('request')
  })

  it('createHttpFromClient get delegates to client.get', async () => {
    const { createHttpFromClient } = await getHttpModule()
    const http = createHttpFromClient(mockHttpClient)

    await http.get('/api/items')
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/items', undefined)
  })

  it('createHttpFromClient post delegates to client.post', async () => {
    const { createHttpFromClient } = await getHttpModule()
    const http = createHttpFromClient(mockHttpClient)

    await http.post('/api/items', { name: 'test' })
    expect(mockHttpClient.post).toHaveBeenCalledWith('/api/items', { name: 'test' }, undefined)
  })

  it('createHttpFromClient put delegates to client.put', async () => {
    const { createHttpFromClient } = await getHttpModule()
    const http = createHttpFromClient(mockHttpClient)

    await http.put('/api/items/1', { name: 'updated' })
    expect(mockHttpClient.put).toHaveBeenCalledWith('/api/items/1', { name: 'updated' }, undefined)
  })

  it('createHttpFromClient patch delegates to client.patch', async () => {
    const { createHttpFromClient } = await getHttpModule()
    const http = createHttpFromClient(mockHttpClient)

    await http.patch('/api/items/1', { name: 'patched' })
    expect(mockHttpClient.patch).toHaveBeenCalledWith(
      '/api/items/1',
      { name: 'patched' },
      undefined,
    )
  })

  it('createHttpFromClient delete delegates to client.delete', async () => {
    const { createHttpFromClient } = await getHttpModule()
    const http = createHttpFromClient(mockHttpClient)

    await http.delete('/api/items/1')
    expect(mockHttpClient.delete).toHaveBeenCalledWith('/api/items/1', undefined)
  })

  it('createHttp returns HTTP helpers from context', async () => {
    const { createHttp } = await getHttpModule()
    const http = createHttp()

    expect(http).toHaveProperty('get')
    expect(http).toHaveProperty('post')
    expect(http).toHaveProperty('put')
    expect(http).toHaveProperty('patch')
    expect(http).toHaveProperty('delete')

    await http.get('/api/test')
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/test', undefined)
  })

  it('createHttpHelpers returns helpers with auth token methods', async () => {
    const { createHttpHelpers } = await getHttpModule()
    const helpers = createHttpHelpers()

    expect(helpers).toHaveProperty('setAuthToken')
    expect(helpers).toHaveProperty('getAuthToken')

    helpers.setAuthToken('new-token')
    expect(mockHttpClient.setAuthToken).toHaveBeenCalledWith('new-token')

    const token = helpers.getAuthToken()
    expect(mockHttpClient.getAuthToken).toHaveBeenCalled()
    expect(token).toBe('token123')
  })

  it('useMutation handles successful POST', async () => {
    const { useMutation } = await getHttpModule()
    const { mutate } = useMutation()

    const result = await mutate('/api/items', { name: 'test' })
    expect(mockHttpClient.post).toHaveBeenCalledWith('/api/items', { name: 'test' })
    expect(result).toEqual({ id: '1' })
  })

  it('useMutation handles PUT method', async () => {
    const { useMutation } = await getHttpModule()
    const { mutate } = useMutation()

    await mutate('/api/items/1', { name: 'updated' }, 'PUT')
    expect(mockHttpClient.put).toHaveBeenCalledWith('/api/items/1', { name: 'updated' })
  })

  it('useMutation handles PATCH method', async () => {
    const { useMutation } = await getHttpModule()
    const { mutate } = useMutation()

    await mutate('/api/items/1', { name: 'patched' }, 'PATCH')
    expect(mockHttpClient.patch).toHaveBeenCalledWith('/api/items/1', { name: 'patched' })
  })

  it('useMutation handles DELETE method', async () => {
    const { useMutation } = await getHttpModule()
    const { mutate } = useMutation()

    await mutate('/api/items/1', undefined, 'DELETE')
    expect(mockHttpClient.delete).toHaveBeenCalledWith('/api/items/1')
  })

  it('useMutation handles errors', async () => {
    mockHttpClient.post.mockRejectedValue(new Error('Server error'))

    const { useMutation } = await getHttpModule()
    const { mutate } = useMutation()

    await expect(mutate('/api/fail', {})).rejects.toThrow('Server error')
  })

  it('useMutation handles non-Error throws', async () => {
    mockHttpClient.post.mockRejectedValue('string error')

    const { useMutation } = await getHttpModule()
    const { mutate } = useMutation()

    await expect(mutate('/api/fail', {})).rejects.toThrow('string error')
  })

  it('useMutation reset clears state', async () => {
    const { useMutation } = await getHttpModule()
    const { mutate, reset, data, isLoading, error } = useMutation()

    await mutate('/api/items', { name: 'test' })
    reset()

    expect(isLoading()).toBe(false)
    expect(error()).toBeNull()
    expect(data()).toBeNull()
  })

  it('useLazyQuery executes GET request on demand', async () => {
    const { useLazyQuery } = await getHttpModule()
    const { execute } = useLazyQuery()

    const result = await execute('/api/search?q=test')
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/search?q=test', undefined)
    expect(result).toEqual({ items: [] })
  })

  it('useLazyQuery handles errors', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('Not found'))

    const { useLazyQuery } = await getHttpModule()
    const { execute } = useLazyQuery()

    await expect(execute('/api/missing')).rejects.toThrow('Not found')
  })

  it('useLazyQuery reset clears state', async () => {
    const { useLazyQuery } = await getHttpModule()
    const { execute, reset, data, isLoading, error } = useLazyQuery()

    await execute('/api/search')
    reset()

    expect(data()).toBeNull()
    expect(isLoading()).toBe(false)
    expect(error()).toBeNull()
  })
})

// --- I18n primitives tests ---
describe('I18n primitives', () => {
  let mockI18nProvider: Mocked<I18nProvider>

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockI18nProvider = {
      getLocale: vi.fn(() => 'en'),
      setLocale: vi.fn(() => Promise.resolve()),
      getLocales: vi.fn(() => [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
      ]),
      addLocale: vi.fn(),
      removeLocale: vi.fn(() => true),
      addTranslations: vi.fn(),
      t: vi.fn((key: string) => `translated:${key}`),
      exists: vi.fn(() => true),
      formatNumber: vi.fn((value: number) => String(value)),
      formatDate: vi.fn(() => 'formatted-date'),
      formatRelativeTime: vi.fn(() => 'formatted-relative-time'),
      formatList: vi.fn(() => 'formatted-list'),
      onLocaleChange: vi.fn((_listener: (locale: string) => void) => () => {}),
      getDirection: vi.fn(() => 'ltr'),
      hasKey: vi.fn(() => true),
      isReady: vi.fn(() => true),
      onReady: vi.fn((_callback: () => void) => () => {}),
    } satisfies Mocked<I18nProvider>
    contextValues.set(I18nContext.id, mockI18nProvider)
  })

  async function getI18nModule() {
    return await import('../primitives/i18n.js')
  }

  it('createI18nFromProvider returns all expected properties', async () => {
    const { createI18nFromProvider } = await getI18nModule()
    const result = createI18nFromProvider(mockI18nProvider)

    expect(result).toHaveProperty('t')
    expect(result).toHaveProperty('locale')
    expect(result).toHaveProperty('setLocale')
    expect(result).toHaveProperty('isReady')
    expect(result).toHaveProperty('getLocales')
    expect(result).toHaveProperty('hasKey')
  })

  it('createI18nFromProvider t delegates to provider', async () => {
    const { createI18nFromProvider } = await getI18nModule()
    const result = createI18nFromProvider(mockI18nProvider)

    const translation = result.t('hello')
    expect(mockI18nProvider.t).toHaveBeenCalledWith('hello', undefined, undefined)
    expect(translation).toBe('translated:hello')
  })

  it('createI18nFromProvider t passes values and options', async () => {
    const { createI18nFromProvider } = await getI18nModule()
    const result = createI18nFromProvider(mockI18nProvider)

    result.t('greeting', { name: 'World' }, { count: 1 })
    expect(mockI18nProvider.t).toHaveBeenCalledWith('greeting', { name: 'World' }, { count: 1 })
  })

  it('createI18nFromProvider locale returns current locale', async () => {
    const { createI18nFromProvider } = await getI18nModule()
    const result = createI18nFromProvider(mockI18nProvider)

    expect(result.locale()).toBe('en')
  })

  it('createI18nFromProvider setLocale delegates to provider', async () => {
    const { createI18nFromProvider } = await getI18nModule()
    const result = createI18nFromProvider(mockI18nProvider)

    await result.setLocale('es')
    expect(mockI18nProvider.setLocale).toHaveBeenCalledWith('es')
  })

  it('createI18nFromProvider getLocales delegates to provider', async () => {
    const { createI18nFromProvider } = await getI18nModule()
    const result = createI18nFromProvider(mockI18nProvider)

    const locales = result.getLocales()
    expect(mockI18nProvider.getLocales).toHaveBeenCalled()
    expect(locales).toEqual([
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
    ])
  })

  it('createI18nFromProvider hasKey delegates to provider.hasKey', async () => {
    const { createI18nFromProvider } = await getI18nModule()
    const result = createI18nFromProvider(mockI18nProvider)

    result.hasKey('some.key')
    expect(mockI18nProvider.hasKey).toHaveBeenCalledWith('some.key')
  })

  it('createI18nFromProvider isReady returns ready state', async () => {
    const { createI18nFromProvider } = await getI18nModule()
    const result = createI18nFromProvider(mockI18nProvider)

    expect(result.isReady()).toBe(true)
  })

  it('createI18nFromProvider subscribes to locale changes', async () => {
    const { createI18nFromProvider } = await getI18nModule()
    createI18nFromProvider(mockI18nProvider)

    expect(mockI18nProvider.onLocaleChange).toHaveBeenCalled()
  })

  it('createI18nHelpers returns helper functions', async () => {
    const { createI18nHelpers } = await getI18nModule()
    const helpers = createI18nHelpers()

    expect(helpers).toHaveProperty('t')
    expect(helpers).toHaveProperty('getLocale')
    expect(helpers).toHaveProperty('setLocale')
    expect(helpers).toHaveProperty('getLocales')
    expect(helpers).toHaveProperty('hasKey')
    expect(helpers).toHaveProperty('isReady')

    helpers.getLocale()
    expect(mockI18nProvider.getLocale).toHaveBeenCalled()

    helpers.setLocale('fr')
    expect(mockI18nProvider.setLocale).toHaveBeenCalledWith('fr')
  })

  it('createI18nFromProvider handles missing hasKey (falls back to exists)', async () => {
    mockI18nProvider.hasKey = undefined
    const { createI18nFromProvider } = await getI18nModule()
    const result = createI18nFromProvider(mockI18nProvider)

    result.hasKey('some.key')
    expect(mockI18nProvider.exists).toHaveBeenCalledWith('some.key')
  })
})

// --- Logger primitives tests ---

/** A full `Logger` whose every method is a mock with its real signature. */
type MockLogger = Mocked<Logger>

const createMockLogger = (): MockLogger => ({
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn(() => 'info'),
  child: vi.fn(() => createMockLogger()),
  withContext: vi.fn(() => createMockLogger()),
  addTransport: vi.fn((_transport: LogTransport) => () => {}),
  removeTransport: vi.fn(),
})

describe('Logger primitives', () => {
  let mockLoggerProvider: Mocked<LoggerProvider>
  let mockLogger: MockLogger

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockLogger = createMockLogger()
    mockLoggerProvider = {
      getLogger: vi.fn((_name?: string) => mockLogger),
      createLogger: vi.fn(
        (_nameOrConfig: string | LoggerConfig, _config?: LoggerConfig) => mockLogger,
      ),
      setLevel: vi.fn(),
      getLevel: vi.fn(() => 'info'),
      addTransport: vi.fn((_transport: LogTransport) => () => {}),
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: vi.fn(() => true),
    } satisfies Mocked<LoggerProvider>
    contextValues.set(LoggerContext.id, mockLoggerProvider)
  })

  async function getLoggerModule() {
    return await import('../primitives/logger.js')
  }

  it('getLogger returns logger from provider', async () => {
    const { getLogger } = await getLoggerModule()
    const logger = getLogger('TestComponent')

    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('TestComponent')
    expect(logger).toBe(mockLogger)
  })

  it('getLogger works without name', async () => {
    const { getLogger } = await getLoggerModule()
    getLogger()

    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith(undefined)
  })

  it('createLogger delegates to provider with config', async () => {
    const { createLogger } = await getLoggerModule()
    const config: LoggerConfig = { name: 'API', level: 'debug' }
    createLogger(config)

    expect(mockLoggerProvider.createLogger).toHaveBeenCalledWith(config)
  })

  it('getRootLogger gets logger without name', async () => {
    const { getRootLogger } = await getLoggerModule()
    getRootLogger()

    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith()
  })

  it('getChildLogger creates child with context', async () => {
    const { getChildLogger } = await getLoggerModule()
    const context = { userId: '123' }
    getChildLogger('Parent', context)

    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('Parent')
    expect(mockLogger.withContext).toHaveBeenCalledWith(context)
  })

  it('useComponentLogger returns logger for component', async () => {
    const { useComponentLogger } = await getLoggerModule()
    const logger = useComponentLogger('Dashboard')

    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('Dashboard')
    expect(logger).toBe(mockLogger)
  })

  it('createLoggerHelpers returns all helper methods', async () => {
    const { createLoggerHelpers } = await getLoggerModule()
    const helpers = createLoggerHelpers()

    expect(helpers).toHaveProperty('getLogger')
    expect(helpers).toHaveProperty('createLogger')
    expect(helpers).toHaveProperty('setLevel')
    expect(helpers).toHaveProperty('getLevel')
    expect(helpers).toHaveProperty('enable')
    expect(helpers).toHaveProperty('disable')
    expect(helpers).toHaveProperty('isEnabled')
  })

  it('createLoggerHelpers delegates all calls to provider', async () => {
    const { createLoggerHelpers } = await getLoggerModule()
    const helpers = createLoggerHelpers()

    helpers.getLogger('test')
    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('test')

    helpers.setLevel('debug')
    expect(mockLoggerProvider.setLevel).toHaveBeenCalledWith('debug')

    expect(helpers.getLevel()).toBe('info')
    expect(mockLoggerProvider.getLevel).toHaveBeenCalled()

    helpers.enable()
    expect(mockLoggerProvider.enable).toHaveBeenCalled()

    helpers.disable()
    expect(mockLoggerProvider.disable).toHaveBeenCalled()

    expect(helpers.isEnabled()).toBe(true)
    expect(mockLoggerProvider.isEnabled).toHaveBeenCalled()
  })

  it('createLoggerHelpersFromProvider works with explicit provider', async () => {
    const { createLoggerHelpersFromProvider } = await getLoggerModule()
    const helpers = createLoggerHelpersFromProvider(mockLoggerProvider)

    helpers.getLogger('from-provider')
    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('from-provider')
  })

  it('createLoggerFromProvider returns logger from specific provider', async () => {
    const { createLoggerFromProvider } = await getLoggerModule()
    const logger = createLoggerFromProvider(mockLoggerProvider, 'specific')

    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('specific')
    expect(logger).toBe(mockLogger)
  })
})

// --- Router primitives tests ---
describe('Router primitives', () => {
  // `getParams` and `matchPath` return their own type parameter, so they need
  // the interface's own generic signature (see GenericMethodMock).
  type MockRouter = Omit<Mocked<Router>, 'getParams' | 'matchPath'> & {
    getParams: GenericMethodMock<Router, 'getParams'>
    matchPath: GenericMethodMock<Router, 'matchPath'>
  }

  let mockRouter: MockRouter

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockRouter = {
      getLocation: vi.fn(() => ({ pathname: '/home', hash: '', search: '' })),
      getParams: asMethod(vi.fn<Router['getParams']>()),
      getQuery: vi.fn(() => ({ q: 'test' })),
      getQueryParam: vi.fn((_key: string) => undefined),
      getHash: vi.fn(() => ''),
      navigate: vi.fn(),
      navigateTo: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      setQuery: vi.fn(),
      setQueryParam: vi.fn(),
      setHash: vi.fn(),
      isActive: vi.fn((path: string, _exact?: boolean) => path === '/home'),
      matchPath: asMethod(vi.fn<Router['matchPath']>()),
      generatePath: vi.fn(() => ''),
      createHref: vi.fn((path: string) => path),
      subscribe: vi.fn((_listener: RouteChangeListener) => () => {}),
      addGuard: vi.fn((_guard: NavigationGuard) => () => {}),
      registerRoutes: vi.fn((_routes: RouteDefinition[]) => {}),
      getRoutes: vi.fn(() => []),
      destroy: vi.fn(),
    }
    mockRouter.getParams.mockReturnValue({ id: '123' })
    mockRouter.matchPath.mockReturnValue(null)
    contextValues.set(RouterContext.id, mockRouter)
  })

  async function getRouterModule() {
    return await import('../primitives/router.js')
  }

  it('createRouterFromInstance returns all expected properties', async () => {
    const { createRouterFromInstance } = await getRouterModule()
    const result = createRouterFromInstance(mockRouter)

    expect(result).toHaveProperty('location')
    expect(result).toHaveProperty('params')
    expect(result).toHaveProperty('query')
    expect(result).toHaveProperty('navigate')
    expect(result).toHaveProperty('navigateTo')
    expect(result).toHaveProperty('back')
    expect(result).toHaveProperty('forward')
    expect(result).toHaveProperty('isActive')
  })

  it('createRouterFromInstance location returns current location', async () => {
    const { createRouterFromInstance } = await getRouterModule()
    const result = createRouterFromInstance(mockRouter)

    expect(result.location()).toEqual({ pathname: '/home', hash: '', search: '' })
  })

  it('createRouterFromInstance params returns current params', async () => {
    const { createRouterFromInstance } = await getRouterModule()
    const result = createRouterFromInstance(mockRouter)

    expect(result.params()).toEqual({ id: '123' })
  })

  it('createRouterFromInstance query returns current query', async () => {
    const { createRouterFromInstance } = await getRouterModule()
    const result = createRouterFromInstance(mockRouter)

    expect(result.query()).toEqual({ q: 'test' })
  })

  it('createRouterFromInstance navigate delegates to router', async () => {
    const { createRouterFromInstance } = await getRouterModule()
    const result = createRouterFromInstance(mockRouter)

    result.navigate('/about', { replace: true })
    expect(mockRouter.navigate).toHaveBeenCalledWith('/about', { replace: true })
  })

  it('createRouterFromInstance navigateTo delegates to router', async () => {
    const { createRouterFromInstance } = await getRouterModule()
    const result = createRouterFromInstance(mockRouter)

    result.navigateTo('user', { id: '1' }, { tab: 'profile' })
    expect(mockRouter.navigateTo).toHaveBeenCalledWith('user', { id: '1' }, { tab: 'profile' })
  })

  it('createRouterFromInstance back/forward delegate to router', async () => {
    const { createRouterFromInstance } = await getRouterModule()
    const result = createRouterFromInstance(mockRouter)

    result.back()
    expect(mockRouter.back).toHaveBeenCalled()

    result.forward()
    expect(mockRouter.forward).toHaveBeenCalled()
  })

  it('createRouterFromInstance isActive delegates to router', async () => {
    const { createRouterFromInstance } = await getRouterModule()
    const result = createRouterFromInstance(mockRouter)

    expect(result.isActive('/home')).toBe(true)
    expect(result.isActive('/about')).toBe(false)
  })

  it('createRouterFromInstance subscribes to route changes', async () => {
    const { createRouterFromInstance } = await getRouterModule()
    createRouterFromInstance(mockRouter)

    expect(mockRouter.subscribe).toHaveBeenCalled()
  })

  it('createRouterHelpers returns helper functions', async () => {
    const { createRouterHelpers } = await getRouterModule()
    const helpers = createRouterHelpers()

    expect(helpers).toHaveProperty('navigate')
    expect(helpers).toHaveProperty('navigateTo')
    expect(helpers).toHaveProperty('back')
    expect(helpers).toHaveProperty('forward')
    expect(helpers).toHaveProperty('getLocation')
    expect(helpers).toHaveProperty('getParams')
    expect(helpers).toHaveProperty('getQuery')
    expect(helpers).toHaveProperty('isActive')

    helpers.navigate('/test')
    expect(mockRouter.navigate).toHaveBeenCalledWith('/test', undefined)

    helpers.back()
    expect(mockRouter.back).toHaveBeenCalled()

    helpers.forward()
    expect(mockRouter.forward).toHaveBeenCalled()

    expect(helpers.getLocation()).toEqual({ pathname: '/home', hash: '', search: '' })
    expect(helpers.getParams()).toEqual({ id: '123' })
    expect(helpers.getQuery()).toEqual({ q: 'test' })
  })
})

// --- State primitives tests ---

/** The state shape the test store holds. */
interface MockState {
  count: number
  name: string
}

describe('State primitives', () => {
  // StateProvider.createStore returns its own type parameter — see GenericMethodMock.
  type MockStateProvider = Omit<Mocked<StateProvider>, 'createStore'> & {
    createStore: GenericMethodMock<StateProvider, 'createStore'>
  }

  let mockStateProvider: MockStateProvider
  let mockStore: Mocked<Store<MockState>>
  let storeCallbacks: StateListener<MockState>[]

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    storeCallbacks = []
    mockStore = {
      getState: vi.fn(() => ({ count: 0, name: 'test' })),
      setState: vi.fn(),
      subscribe: vi.fn((listener: StateListener<MockState>) => {
        storeCallbacks.push(listener)
        return () => {
          storeCallbacks = storeCallbacks.filter((c) => c !== listener)
        }
      }),
      destroy: vi.fn(),
    }
    mockStateProvider = {
      createStore: asMethod(vi.fn<StateProvider['createStore']>()),
    }
    mockStateProvider.createStore.mockReturnValue(mockStore)
    contextValues.set(StateContext.id, mockStateProvider)
  })

  async function getStateModule() {
    return await import('../primitives/state.js')
  }

  it('createStore delegates to state provider', async () => {
    const { createStore } = await getStateModule()
    const config = { initialState: { count: 0 } }
    const store = createStore(config)

    expect(mockStateProvider.createStore).toHaveBeenCalledWith(config)
    expect(store).toBe(mockStore)
  })

  it('useStore returns accessor for store state', async () => {
    const { useStore } = await getStateModule()
    const state = useStore(mockStore)

    expect(state()).toEqual({ count: 0, name: 'test' })
  })

  it('useStore with selector returns selected value', async () => {
    const { useStore } = await getStateModule()
    const count = useStore(mockStore, { selector: (state) => state.count })

    expect(count()).toBe(0)
  })

  it('useStore subscribes to store changes', async () => {
    const { useStore } = await getStateModule()
    useStore(mockStore)

    expect(mockStore.subscribe).toHaveBeenCalled()
  })

  it('createSignalStore returns accessor and setter', async () => {
    const { createSignalStore } = await getStateModule()
    const [state, setState] = createSignalStore(42)

    expect(state()).toBe(42)
    setState(100)
    expect(state()).toBe(100)
  })

  it('createSignalStore setter accepts updater function', async () => {
    const { createSignalStore } = await getStateModule()
    const [state, setState] = createSignalStore(10)

    setState((prev: number) => prev + 5)
    expect(state()).toBe(15)
  })

  it('createPersistedStore loads from storage', async () => {
    const { createPersistedStore } = await getStateModule()
    const mockStorageAdapter = {
      getItem: vi.fn(() => JSON.stringify('stored-value')),
      setItem: vi.fn(),
    }

    const [state] = createPersistedStore('key', 'default', mockStorageAdapter)
    expect(mockStorageAdapter.getItem).toHaveBeenCalledWith('key')
    expect(state()).toBe('stored-value')
  })

  it('createPersistedStore uses default when storage is empty', async () => {
    const { createPersistedStore } = await getStateModule()
    const mockStorageAdapter = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    }

    const [state] = createPersistedStore('key', 'default', mockStorageAdapter)
    expect(state()).toBe('default')
  })

  it('createPersistedStore handles storage parse errors gracefully', async () => {
    const { createPersistedStore } = await getStateModule()
    const mockStorageAdapter = {
      getItem: vi.fn(() => 'invalid-json{{{'),
      setItem: vi.fn(),
    }

    const [state] = createPersistedStore('key', 'fallback', mockStorageAdapter)
    expect(state()).toBe('fallback')
  })

  it('createStateHelpers returns helper with createStore', async () => {
    const { createStateHelpers } = await getStateModule()
    const helpers = createStateHelpers()

    expect(helpers).toHaveProperty('createStore')

    helpers.createStore({ initialState: { count: 0 } })
    expect(mockStateProvider.createStore).toHaveBeenCalled()
  })

  it('createStateHelpersFromProvider works with explicit provider', async () => {
    const { createStateHelpersFromProvider } = await getStateModule()
    const helpers = createStateHelpersFromProvider(mockStateProvider)

    helpers.createStore({ initialState: { value: 'x' } })
    expect(mockStateProvider.createStore).toHaveBeenCalled()
  })
})

// --- Storage primitives tests ---
describe('Storage primitives', () => {
  // StorageProvider.get returns its own type parameter — see GenericMethodMock.
  type MockStorageProvider = Omit<Mocked<StorageProvider>, 'get'> & {
    get: GenericMethodMock<StorageProvider, 'get'>
  }

  let mockStorageProvider: MockStorageProvider

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockStorageProvider = {
      get: asMethod(vi.fn<StorageProvider['get']>()),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
      keys: vi.fn(() => Promise.resolve(['a', 'b'])),
    }
    mockStorageProvider.get.mockResolvedValue('stored')
    contextValues.set(StorageContext.id, mockStorageProvider)
  })

  async function getStorageModule() {
    return await import('../primitives/storage.js')
  }

  it('createStorage returns all storage methods', async () => {
    const { createStorage } = await getStorageModule()
    const storage = createStorage()

    expect(storage).toHaveProperty('get')
    expect(storage).toHaveProperty('set')
    expect(storage).toHaveProperty('remove')
    expect(storage).toHaveProperty('clear')
    expect(storage).toHaveProperty('keys')
  })

  it('createStorage delegates get to provider', async () => {
    const { createStorage } = await getStorageModule()
    const storage = createStorage()

    await storage.get('myKey')
    expect(mockStorageProvider.get).toHaveBeenCalledWith('myKey')
  })

  it('createStorage delegates set to provider', async () => {
    const { createStorage } = await getStorageModule()
    const storage = createStorage()

    await storage.set('myKey', 'myValue')
    expect(mockStorageProvider.set).toHaveBeenCalledWith('myKey', 'myValue')
  })

  it('createStorage delegates remove to provider', async () => {
    const { createStorage } = await getStorageModule()
    const storage = createStorage()

    await storage.remove('myKey')
    expect(mockStorageProvider.remove).toHaveBeenCalledWith('myKey')
  })

  it('createStorage delegates clear to provider', async () => {
    const { createStorage } = await getStorageModule()
    const storage = createStorage()

    await storage.clear()
    expect(mockStorageProvider.clear).toHaveBeenCalled()
  })

  it('createStorage delegates keys to provider', async () => {
    const { createStorage } = await getStorageModule()
    const storage = createStorage()

    const keys = await storage.keys()
    expect(mockStorageProvider.keys).toHaveBeenCalled()
    expect(keys).toEqual(['a', 'b'])
  })

  it('createStorageFromProvider works with explicit provider', async () => {
    const { createStorageFromProvider } = await getStorageModule()
    const storage = createStorageFromProvider(mockStorageProvider)

    await storage.get('key')
    expect(mockStorageProvider.get).toHaveBeenCalledWith('key')

    await storage.set('key', 'val')
    expect(mockStorageProvider.set).toHaveBeenCalledWith('key', 'val')
  })

  it('createStorageValueFromProvider returns value accessor and actions', async () => {
    const { createStorageValueFromProvider } = await getStorageModule()
    const sv = createStorageValueFromProvider(mockStorageProvider, 'testKey', 'default')

    expect(sv).toHaveProperty('value')
    expect(sv).toHaveProperty('loading')
    expect(sv).toHaveProperty('error')
    expect(sv).toHaveProperty('set')
    expect(sv).toHaveProperty('remove')
  })

  it('createStorageValueFromProvider set delegates to provider', async () => {
    const { createStorageValueFromProvider } = await getStorageModule()
    const sv = createStorageValueFromProvider(mockStorageProvider, 'testKey')

    await sv.set('new-value')
    expect(mockStorageProvider.set).toHaveBeenCalledWith('testKey', 'new-value')
  })

  it('createStorageValueFromProvider remove delegates to provider', async () => {
    const { createStorageValueFromProvider } = await getStorageModule()
    const sv = createStorageValueFromProvider(mockStorageProvider, 'testKey')

    await sv.remove()
    expect(mockStorageProvider.remove).toHaveBeenCalledWith('testKey')
  })

  it('createStorageHelpers returns utility functions', async () => {
    const { createStorageHelpers } = await getStorageModule()
    const helpers = createStorageHelpers()

    expect(helpers).toHaveProperty('get')
    expect(helpers).toHaveProperty('set')
    expect(helpers).toHaveProperty('remove')
    expect(helpers).toHaveProperty('clear')
    expect(helpers).toHaveProperty('keys')

    await helpers.get('k')
    expect(mockStorageProvider.get).toHaveBeenCalledWith('k')
  })
})

// --- Theme primitives tests ---

/** Complete themes (every token group), used as the provider's fixtures. */
const lightTheme = createLightTheme()
const darkTheme = createDarkTheme()

describe('Theme primitives', () => {
  let mockThemeProvider: Mocked<ThemeProvider>

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockThemeProvider = {
      getTheme: vi.fn(() => lightTheme),
      setTheme: vi.fn(),
      toggleMode: vi.fn(),
      subscribe: vi.fn((_callback: (theme: Theme) => void) => () => {}),
      getThemes: vi.fn(() => [lightTheme, darkTheme]),
    } satisfies Mocked<ThemeProvider>
    contextValues.set(ThemeContext.id, mockThemeProvider)
  })

  async function getThemeModule() {
    return await import('../primitives/theme.js')
  }

  it('createThemeFromProvider returns all expected properties', async () => {
    const { createThemeFromProvider } = await getThemeModule()
    const result = createThemeFromProvider(mockThemeProvider)

    expect(result).toHaveProperty('theme')
    expect(result).toHaveProperty('themeName')
    expect(result).toHaveProperty('mode')
    expect(result).toHaveProperty('setTheme')
    expect(result).toHaveProperty('toggleTheme')
  })

  it('createThemeFromProvider theme returns current theme', async () => {
    const { createThemeFromProvider } = await getThemeModule()
    const result = createThemeFromProvider(mockThemeProvider)

    expect(result.theme()).toEqual(lightTheme)
  })

  it('createThemeFromProvider themeName returns theme name', async () => {
    const { createThemeFromProvider } = await getThemeModule()
    const result = createThemeFromProvider(mockThemeProvider)

    expect(result.themeName()).toBe('light')
  })

  it('createThemeFromProvider mode returns current mode', async () => {
    const { createThemeFromProvider } = await getThemeModule()
    const result = createThemeFromProvider(mockThemeProvider)

    expect(result.mode()).toBe('light')
  })

  it('createThemeFromProvider setTheme delegates to provider', async () => {
    const { createThemeFromProvider } = await getThemeModule()
    const result = createThemeFromProvider(mockThemeProvider)

    result.setTheme('dark')
    expect(mockThemeProvider.setTheme).toHaveBeenCalledWith('dark')
  })

  it('createThemeFromProvider toggleTheme delegates to provider.toggleMode', async () => {
    const { createThemeFromProvider } = await getThemeModule()
    const result = createThemeFromProvider(mockThemeProvider)

    result.toggleTheme()
    expect(mockThemeProvider.toggleMode).toHaveBeenCalled()
  })

  it('createThemeFromProvider subscribes to theme changes', async () => {
    const { createThemeFromProvider } = await getThemeModule()
    createThemeFromProvider(mockThemeProvider)

    expect(mockThemeProvider.subscribe).toHaveBeenCalled()
  })

  it('createThemeHelpers returns helper functions', async () => {
    const { createThemeHelpers } = await getThemeModule()
    const helpers = createThemeHelpers()

    expect(helpers).toHaveProperty('getTheme')
    expect(helpers).toHaveProperty('setTheme')
    expect(helpers).toHaveProperty('getMode')
    expect(helpers).toHaveProperty('toggleMode')
    expect(helpers).toHaveProperty('getAvailableThemes')

    helpers.getTheme()
    expect(mockThemeProvider.getTheme).toHaveBeenCalled()

    helpers.setTheme('dark')
    expect(mockThemeProvider.setTheme).toHaveBeenCalledWith('dark')

    helpers.toggleMode()
    expect(mockThemeProvider.toggleMode).toHaveBeenCalled()

    const themes = helpers.getAvailableThemes()
    expect(themes).toEqual([lightTheme, darkTheme])
  })

  it('createThemeHelpers handles missing getThemes', async () => {
    mockThemeProvider.getThemes = undefined
    const { createThemeHelpers } = await getThemeModule()
    const helpers = createThemeHelpers()

    expect(helpers.getAvailableThemes()).toEqual([])
  })
})

// --- OAuth primitives tests ---
describe('OAuth primitives', () => {
  interface MockLocation {
    href: string
    pathname: string
    search: string
    origin: string
  }

  let mockLocation: MockLocation
  let replaceStateMock: ReturnType<typeof vi.fn>
  let sessionStore: Map<string, string>
  let fetchMock: ReturnType<typeof vi.fn>
  let mockAuthClient: MockAuthClient

  const setPath = (pathname: string, search = ''): void => {
    mockLocation.pathname = pathname
    mockLocation.search = search
    mockLocation.href = `https://app.example.com${pathname}${search}`
  }

  const okResponse = (body: unknown, headers: Record<string, string> = {}) => ({
    ok: true,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(body),
  })

  const errorResponse = (body: unknown) => ({
    ok: false,
    headers: {
      get: () => null,
    },
    json: () => Promise.resolve(body),
  })

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mountCallbacks = []
    currentOwner = null
    sessionStore = new Map()
    mockLocation = {
      href: 'https://app.example.com/',
      pathname: '/',
      search: '',
      origin: 'https://app.example.com',
    }
    replaceStateMock = vi.fn((_state: unknown, _title: string, url: string) => {
      const parsed = new URL(url)
      mockLocation.href = parsed.toString()
      mockLocation.pathname = parsed.pathname
      mockLocation.search = parsed.search
    })
    vi.stubGlobal('window', {
      location: mockLocation,
      history: { replaceState: replaceStateMock },
    })
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => sessionStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionStore.set(key, value)
      },
      removeItem: (key: string) => {
        sessionStore.delete(key)
      },
    })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mockAuthClient = createMockAuthClient()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function getOAuthModule() {
    return await import('../primitives/oauth.js')
  }

  it('createOAuth returns providers, getOAuthUrl, redirect, and handleCallback', async () => {
    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ oauthProviders: ['github', 'google'] })

    expect(oauth).toHaveProperty('providers')
    expect(oauth).toHaveProperty('getOAuthUrl')
    expect(oauth).toHaveProperty('redirect')
    expect(oauth).toHaveProperty('handleCallback')
    expect(oauth.providers()).toEqual(['github', 'google'])
  })

  it('getOAuthUrl encodes the provider as a single path segment', async () => {
    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ baseURL: 'https://api.example.com' })

    expect(oauth.getOAuthUrl('github')).toBe('https://api.example.com/oauth/github')
    expect(oauth.getOAuthUrl('we/ird')).toBe('https://api.example.com/oauth/we%2Fird')
  })

  it('redirect appends redirect_to for a non-root path and stashes the provider', async () => {
    setPath('/login')
    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ baseURL: 'https://api.example.com' })

    oauth.redirect('github')

    expect(sessionStore.get('oauth_provider')).toBe('github')
    expect(mockLocation.href).toBe('https://api.example.com/oauth/github?redirect_to=%2Flogin')
  })

  it('redirect omits redirect_to at the root path', async () => {
    setPath('/')
    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ baseURL: 'https://api.example.com' })

    oauth.redirect('github')

    expect(mockLocation.href).toBe('https://api.example.com/oauth/github')
  })

  it('handleCallback exchanges the code, establishes the session, and cleans the URL', async () => {
    setPath('/login')
    const onSuccess = vi.fn()
    const onError = vi.fn()
    fetchMock.mockResolvedValue(
      okResponse({ props: { id: '1', name: 'Alice' } }, { authorization: 'Bearer tok-1' }),
    )

    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({
      baseURL: 'https://api.example.com',
      authClient: mockAuthClient,
      onSuccess,
      onError,
    })

    setPath('/login', '?code=abc123&state=xyz')
    sessionStore.set('oauth_provider', 'github')

    await oauth.handleCallback()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.example.com/users/log-in/oauth')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({
      server: 'github',
      code: 'abc123',
      state: 'xyz',
      redirect_uri: 'https://app.example.com',
    })

    expect(mockAuthClient.setAccessToken).toHaveBeenCalledWith('tok-1')
    expect(mockAuthClient.setUser).toHaveBeenCalledWith({ id: '1', name: 'Alice' })
    expect(mockAuthClient.initialize).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()

    // URL cleaned (code/state removed) and stash cleared
    expect(replaceStateMock).toHaveBeenCalled()
    expect(mockLocation.pathname).toBe('/login')
    expect(mockLocation.search).toBe('')
    expect(sessionStore.has('oauth_provider')).toBe(false)
  })

  it('handleCallback POSTs to a custom loginEndpoint when configured', async () => {
    setPath('/login')
    fetchMock.mockResolvedValue(okResponse({ props: { id: '1' } }))

    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({
      baseURL: 'https://api.example.com',
      loginEndpoint: '/custom/oauth-login',
      authClient: mockAuthClient,
    })

    setPath('/login', '?code=abc123')
    sessionStore.set('oauth_provider', 'github')

    await oauth.handleCallback()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/custom/oauth-login',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('handleCallback surfaces the server error on a non-ok response without setting the user', async () => {
    setPath('/login')
    const onError = vi.fn()
    fetchMock.mockResolvedValue(errorResponse({ error: 'Invalid state' }))

    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ authClient: mockAuthClient, onError })

    setPath('/login', '?code=abc123&state=xyz')
    sessionStore.set('oauth_provider', 'github')

    await oauth.handleCallback()

    expect(onError).toHaveBeenCalledWith('Invalid state')
    expect(mockAuthClient.setAccessToken).not.toHaveBeenCalled()
    expect(mockAuthClient.setUser).not.toHaveBeenCalled()
  })

  it('handleCallback does nothing without a code param', async () => {
    setPath('/login')
    sessionStore.set('oauth_provider', 'github')

    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ authClient: mockAuthClient })

    await oauth.handleCallback()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('handleCallback does nothing when no provider was stashed', async () => {
    setPath('/login', '?code=abc123')

    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ authClient: mockAuthClient })

    await oauth.handleCallback()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('auto-runs the callback at creation outside a Solid owner', async () => {
    setPath('/login', '?code=auto1&state=s1')
    sessionStore.set('oauth_provider', 'google')
    const onSuccess = vi.fn()
    fetchMock.mockResolvedValue(
      okResponse({ user: { id: '2' } }, { 'set-authorization': 'Bearer tok-2' }),
    )

    const { createOAuth } = await getOAuthModule()
    createOAuth({ authClient: mockAuthClient, onSuccess })

    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockAuthClient.setAccessToken).toHaveBeenCalledWith('tok-2')
    expect(mockAuthClient.setUser).toHaveBeenCalledWith({ id: '2' })
  })

  it('auto-runs the callback via onMount when created inside a Solid owner', async () => {
    currentOwner = {}
    setPath('/login', '?code=auto2')
    sessionStore.set('oauth_provider', 'github')
    const onSuccess = vi.fn()
    fetchMock.mockResolvedValue(okResponse({ props: { id: '3' } }))

    const { createOAuth } = await getOAuthModule()
    createOAuth({ authClient: mockAuthClient, onSuccess })

    expect(mountCallbacks.length).toBeGreaterThan(0)
    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('resolves the auth client from context when no override is provided', async () => {
    contextValues.set(AuthContext.id, mockAuthClient)
    setPath('/login')
    const onSuccess = vi.fn()
    fetchMock.mockResolvedValue(
      okResponse({ props: { id: '4' } }, { authorization: 'Bearer tok-4' }),
    )

    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ onSuccess })

    setPath('/login', '?code=ctx1')
    sessionStore.set('oauth_provider', 'github')

    await oauth.handleCallback()

    expect(mockAuthClient.setAccessToken).toHaveBeenCalledWith('tok-4')
    expect(mockAuthClient.setUser).toHaveBeenCalledWith({ id: '4' })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('falls back to the cookie session when no auth client is available', async () => {
    setPath('/login')
    const onSuccess = vi.fn()
    const onError = vi.fn()
    fetchMock.mockResolvedValue(okResponse({ props: { id: '5' } }))

    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ onSuccess, onError })

    setPath('/login', '?code=cookie1')
    sessionStore.set('oauth_provider', 'github')

    await oauth.handleCallback()

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('surfaces OAuth login failed when the response carries no user', async () => {
    setPath('/login')
    const onError = vi.fn()
    fetchMock.mockResolvedValue(okResponse({}))

    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ authClient: mockAuthClient, onError })

    setPath('/login', '?code=nouser')
    sessionStore.set('oauth_provider', 'github')

    await oauth.handleCallback()

    expect(onError).toHaveBeenCalledWith('OAuth login failed')
    expect(mockAuthClient.setUser).not.toHaveBeenCalled()
  })

  it('surfaces network errors via onError', async () => {
    setPath('/login')
    const onError = vi.fn()
    fetchMock.mockRejectedValue(new Error('network down'))

    const { createOAuth } = await getOAuthModule()
    const oauth = createOAuth({ authClient: mockAuthClient, onError })

    setPath('/login', '?code=neterr')
    sessionStore.set('oauth_provider', 'github')

    await oauth.handleCallback()

    expect(onError).toHaveBeenCalledWith('network down')
  })
})
