import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mock solid-js ---
const contextValues = new Map<symbol, unknown>()
let effectCallbacks: (() => void)[] = []
let cleanupCallbacks: (() => void)[] = []

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
      const getter = (() => value) as unknown as (() => T) & { _type: string }
      getter._type = 'accessor'
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
    createResource: vi.fn((_source: unknown, _fetcher: unknown) => {
      const resource = (() => undefined) as unknown as (() => undefined) & {
        loading: boolean
        error: undefined
      }
      resource.loading = false
      resource.error = undefined
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
describe('Auth primitives', () => {
  let mockAuthClient: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockAuthClient = {
      getState: vi.fn(() => ({
        user: null,
        authenticated: false,
        loading: true,
        error: null,
      })),
      onAuthChange: vi.fn((_cb: unknown) => {
        return () => {}
      }),
      login: vi.fn(() => Promise.resolve({ user: { name: 'Test' }, token: 'abc' })),
      logout: vi.fn(() => Promise.resolve()),
      register: vi.fn(() => Promise.resolve({ user: { name: 'New' }, token: 'def' })),
      refresh: vi.fn(() => Promise.resolve({ user: { name: 'Test' }, token: 'abc' })),
      getUser: vi.fn(() => null),
      getToken: vi.fn(() => null),
      isAuthenticated: vi.fn(() => false),
    }
    contextValues.set(AuthContext.id, mockAuthClient)
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
    mockAuthClient.getState.mockReturnValue({
      user: { name: 'Alice' },
      authenticated: true,
      loading: false,
      error: null,
    })

    const { createAuthFromClient } = await getAuthModule()
    const result = createAuthFromClient(mockAuthClient)

    expect(result.state()).toEqual({
      user: { name: 'Alice' },
      authenticated: true,
      loading: false,
      error: null,
    })
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
describe('HTTP primitives', () => {
  let mockHttpClient: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockHttpClient = {
      get: vi.fn(() => Promise.resolve({ data: { items: [] }, status: 200 })),
      post: vi.fn(() => Promise.resolve({ data: { id: '1' }, status: 201 })),
      put: vi.fn(() => Promise.resolve({ data: { updated: true }, status: 200 })),
      patch: vi.fn(() => Promise.resolve({ data: { patched: true }, status: 200 })),
      delete: vi.fn(() => Promise.resolve({ data: null, status: 204 })),
      request: vi.fn(() => Promise.resolve({ data: {}, status: 200 })),
      setAuthToken: vi.fn(),
      getAuthToken: vi.fn(() => 'token123'),
    }
    contextValues.set(HttpContext.id, mockHttpClient)
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
  let mockI18nProvider: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockI18nProvider = {
      getLocale: vi.fn(() => 'en'),
      getDirection: vi.fn(() => 'ltr' as const),
      getLocales: vi.fn(() => [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
      ]),
      t: vi.fn((key: string, _values?: unknown, _options?: unknown) => `translated:${key}`),
      setLocale: vi.fn(() => Promise.resolve()),
      formatNumber: vi.fn((value: number) => String(value)),
      formatDate: vi.fn(() => 'formatted-date'),
      onLocaleChange: vi.fn((_cb: unknown) => () => {}),
      onReady: vi.fn((_cb: unknown) => () => {}),
      isReady: vi.fn(() => true),
      hasKey: vi.fn((_key: string) => true),
      exists: vi.fn((_key: string) => true),
    }
    contextValues.set(I18nContext.id, mockI18nProvider)
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

    result.t('greeting', { name: 'World' }, { count: 1 } as unknown)
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
describe('Logger primitives', () => {
  let mockLoggerProvider: Record<string, ReturnType<typeof vi.fn>>
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      withContext: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      })),
    }
    mockLoggerProvider = {
      getLogger: vi.fn(() => mockLogger),
      createLogger: vi.fn(() => mockLogger),
      setLevel: vi.fn(),
      getLevel: vi.fn(() => 'info'),
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: vi.fn(() => true),
    }
    contextValues.set(LoggerContext.id, mockLoggerProvider)
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
    const config = { name: 'API', level: 'debug' } as unknown
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
  let mockRouter: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockRouter = {
      getLocation: vi.fn(() => ({ pathname: '/home', hash: '', search: '' })),
      getParams: vi.fn(() => ({ id: '123' })),
      getQuery: vi.fn(() => ({ q: 'test' })),
      subscribe: vi.fn((_cb: unknown) => () => {}),
      navigate: vi.fn(),
      navigateTo: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      isActive: vi.fn((path: string) => path === '/home'),
    }
    contextValues.set(RouterContext.id, mockRouter)
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
describe('State primitives', () => {
  let mockStateProvider: Record<string, ReturnType<typeof vi.fn>>
  let mockStore: Record<string, ReturnType<typeof vi.fn>>
  let storeCallbacks: ((state: unknown) => void)[]

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    storeCallbacks = []
    mockStore = {
      getState: vi.fn(() => ({ count: 0, name: 'test' })),
      setState: vi.fn(),
      subscribe: vi.fn((cb: (state: unknown) => void) => {
        storeCallbacks.push(cb)
        return () => {
          storeCallbacks = storeCallbacks.filter((c) => c !== cb)
        }
      }),
    }
    mockStateProvider = {
      createStore: vi.fn(() => mockStore),
    }
    contextValues.set(StateContext.id, mockStateProvider)
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async function getStateModule() {
    return await import('../primitives/state.js')
  }

  it('createStore delegates to state provider', async () => {
    const { createStore } = await getStateModule()
    const config = { initial: { count: 0 } }
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
    const count = useStore(mockStore, (s: Record<string, unknown>) => s.count)

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

    helpers.createStore({ initial: { count: 0 } } as unknown)
    expect(mockStateProvider.createStore).toHaveBeenCalled()
  })

  it('createStateHelpersFromProvider works with explicit provider', async () => {
    const { createStateHelpersFromProvider } = await getStateModule()
    const helpers = createStateHelpersFromProvider(mockStateProvider)

    helpers.createStore({ initial: { value: 'x' } } as unknown)
    expect(mockStateProvider.createStore).toHaveBeenCalled()
  })
})

// --- Storage primitives tests ---
describe('Storage primitives', () => {
  let mockStorageProvider: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockStorageProvider = {
      get: vi.fn(() => Promise.resolve('stored')),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
      keys: vi.fn(() => Promise.resolve(['a', 'b'])),
    }
    contextValues.set(StorageContext.id, mockStorageProvider)
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
describe('Theme primitives', () => {
  let mockThemeProvider: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    contextValues.clear()
    effectCallbacks = []
    cleanupCallbacks = []
    mockThemeProvider = {
      getTheme: vi.fn(() => ({
        name: 'light',
        mode: 'light' as const,
        colors: { background: '#fff' },
      })),
      subscribe: vi.fn((_cb: unknown) => () => {}),
      setTheme: vi.fn(),
      toggleMode: vi.fn(),
      getThemes: vi.fn(() => [
        { name: 'light', mode: 'light' },
        { name: 'dark', mode: 'dark' },
      ]),
    }
    contextValues.set(ThemeContext.id, mockThemeProvider)
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

    expect(result.theme()).toEqual({
      name: 'light',
      mode: 'light',
      colors: { background: '#fff' },
    })
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
    expect(themes).toEqual([
      { name: 'light', mode: 'light' },
      { name: 'dark', mode: 'dark' },
    ])
  })

  it('createThemeHelpers handles missing getThemes', async () => {
    mockThemeProvider.getThemes = undefined
    const { createThemeHelpers } = await getThemeModule()
    const helpers = createThemeHelpers()

    expect(helpers.getAvailableThemes()).toEqual([])
  })
})
