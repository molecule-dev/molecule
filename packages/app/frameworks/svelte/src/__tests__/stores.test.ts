import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { HttpClient, RequestConfig } from '@molecule/app-http'
import type { I18nProvider, InterpolationValues, NumberFormatOptions } from '@molecule/app-i18n'
import type { Logger, LoggerConfig, LoggerProvider } from '@molecule/app-logger'
import type { RouteLocation, Router } from '@molecule/app-routing'
import type { Store as MoleculeStore } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

// --- Mock svelte/store ---
type Subscriber<T> = (value: T) => void
type Unsubscriber = () => void

function createMockWritable<T>(initial: T): {
  set(newValue: T): void
  update(updater: (current: T) => T): void
  subscribe(fn: Subscriber<T>): Unsubscriber
  _getValue: () => T
} {
  let value = initial
  const subscribers = new Set<Subscriber<T>>()

  return {
    set(newValue: T) {
      value = newValue
      subscribers.forEach((fn) => fn(value))
    },
    update(updater: (current: T) => T) {
      value = updater(value)
      subscribers.forEach((fn) => fn(value))
    },
    subscribe(fn: Subscriber<T>): Unsubscriber {
      fn(value)
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    },
    _getValue: () => value,
  }
}

function createMockReadable<T>(
  initial: T,
  start?: (set: (value: T) => void) => Unsubscriber | void,
): {
  subscribe(fn: Subscriber<T>): Unsubscriber
  _getValue: () => T
} {
  let value = initial
  const subscribers = new Set<Subscriber<T>>()
  let stopFn: Unsubscriber | void

  const set = (newValue: T): void => {
    value = newValue
    subscribers.forEach((fn) => fn(value))
  }

  return {
    subscribe(fn: Subscriber<T>): Unsubscriber {
      if (subscribers.size === 0 && start) {
        stopFn = start(set)
      }
      fn(value)
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
        if (subscribers.size === 0 && stopFn) {
          stopFn()
        }
      }
    },
    _getValue: () => value,
  }
}

function createMockDerived<T, S>(
  store: { subscribe: (fn: Subscriber<T>) => Unsubscriber },
  fn: (value: T) => S,
): {
  subscribe(sub: Subscriber<S>): Unsubscriber
} {
  let derivedValue: S
  const subscribers = new Set<Subscriber<S>>()
  let parentUnsub: Unsubscriber | null = null

  return {
    subscribe(sub: Subscriber<S>): Unsubscriber {
      if (subscribers.size === 0) {
        parentUnsub = store.subscribe((val: T) => {
          derivedValue = fn(val)
          subscribers.forEach((s) => s(derivedValue))
        })
      }
      sub(derivedValue)
      subscribers.add(sub)
      return () => {
        subscribers.delete(sub)
        if (subscribers.size === 0 && parentUnsub) {
          parentUnsub()
          parentUnsub = null
        }
      }
    },
  }
}

vi.mock('svelte/store', () => ({
  writable: vi.fn(<T>(initial: T) => createMockWritable<T>(initial)),
  readable: vi.fn(<T>(initial: T, start?: (set: (value: T) => void) => Unsubscriber | void) =>
    createMockReadable<T>(initial, start),
  ),
  derived: vi.fn(
    <T, S>(store: { subscribe: (fn: Subscriber<T>) => Unsubscriber }, fn: (value: T) => S) =>
      createMockDerived<T, S>(store, fn),
  ),
  get: vi.fn(<T>(store: { subscribe: (fn: Subscriber<T>) => Unsubscriber }) => {
    let value: T
    const unsub = store.subscribe((v: T) => {
      value = v
    })
    unsub()
    return value!
  }),
}))

// --- Mock svelte context ---
const contextStore = new Map<symbol, unknown>()

vi.mock('svelte', () => ({
  getContext: vi.fn((key: symbol) => contextStore.get(key)),
  setContext: vi.fn((key: symbol, value: unknown) => {
    contextStore.set(key, value)
  }),
}))

// Helper to get store value
function getValue<T>(store: { subscribe: (fn: (v: T) => void) => () => void }): T {
  let value: T
  const unsub = store.subscribe((v) => {
    value = v
  })
  unsub()
  return value!
}

// --- Auth stores tests ---
describe('Auth stores', () => {
  let mockAuthClient: AuthClient<unknown>
  let authChangeCallbacks: ((state: AuthState<unknown>) => void)[]

  beforeEach(() => {
    contextStore.clear()
    authChangeCallbacks = []
    mockAuthClient = {
      getState: vi.fn(() => ({
        user: null,
        authenticated: false,
        loading: false,
        error: null,
      })),
      onAuthChange: vi.fn((cb: (state: AuthState<unknown>) => void) => {
        authChangeCallbacks.push(cb)
        return () => {
          authChangeCallbacks = authChangeCallbacks.filter((c) => c !== cb)
        }
      }),
      login: vi.fn(() => Promise.resolve({ user: { name: 'Test' }, token: 'abc' })),
      logout: vi.fn(() => Promise.resolve()),
      register: vi.fn(() => Promise.resolve({ user: { name: 'New' }, token: 'def' })),
      refresh: vi.fn(() => Promise.resolve({ user: { name: 'Test' }, token: 'abc' })),
    } as unknown as AuthClient<unknown>
  })

  // We need a fresh import for each describe to avoid stale context
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  async function getAuthStoresModule(): Promise<typeof import('../stores/auth.js')> {
    const mod = await import('../stores/auth.js')
    return mod
  }

  it('createAuthStoresFromClient returns stores and actions', async () => {
    const { createAuthStoresFromClient } = await getAuthStoresModule()
    const result = createAuthStoresFromClient(mockAuthClient)

    expect(result).toHaveProperty('state')
    expect(result).toHaveProperty('user')
    expect(result).toHaveProperty('isAuthenticated')
    expect(result).toHaveProperty('isLoading')
    expect(result).toHaveProperty('login')
    expect(result).toHaveProperty('logout')
    expect(result).toHaveProperty('register')
    expect(result).toHaveProperty('refresh')
  })

  it('createAuthStoresFromClient delegates login to client', async () => {
    const { createAuthStoresFromClient } = await getAuthStoresModule()
    const result = createAuthStoresFromClient(mockAuthClient)

    const creds = { email: 'test@example.com', password: '123' }
    await result.login(creds)
    expect(mockAuthClient.login).toHaveBeenCalledWith(creds)
  })

  it('createAuthStoresFromClient delegates logout to client', async () => {
    const { createAuthStoresFromClient } = await getAuthStoresModule()
    const result = createAuthStoresFromClient(mockAuthClient)

    await result.logout()
    expect(mockAuthClient.logout).toHaveBeenCalled()
  })

  it('createAuthStoresFromClient delegates register to client', async () => {
    const { createAuthStoresFromClient } = await getAuthStoresModule()
    const result = createAuthStoresFromClient(mockAuthClient)

    const data = { email: 'new@example.com', password: '123' }
    await result.register(data)
    expect(mockAuthClient.register).toHaveBeenCalledWith(data)
  })

  it('createAuthStoresFromClient delegates refresh to client', async () => {
    const { createAuthStoresFromClient } = await getAuthStoresModule()
    const result = createAuthStoresFromClient(mockAuthClient)

    await result.refresh()
    expect(mockAuthClient.refresh).toHaveBeenCalled()
  })

  it('createAuthStoresFromClient reads initial state from client', async () => {
    mockAuthClient.getState.mockReturnValue({
      user: { name: 'Existing' },
      authenticated: true,
      loading: false,
      error: null,
    })

    const { createAuthStoresFromClient } = await getAuthStoresModule()
    createAuthStoresFromClient(mockAuthClient)

    // The readable store is initialized with client.getState()
    expect(mockAuthClient.getState).toHaveBeenCalled()
  })

  it('createAuthStoresFromClient subscribes to auth changes when store is subscribed to', async () => {
    const { createAuthStoresFromClient } = await getAuthStoresModule()
    const result = createAuthStoresFromClient(mockAuthClient)

    // readable start function is called when the first subscriber attaches
    const unsub = result.state.subscribe(() => {})
    expect(mockAuthClient.onAuthChange).toHaveBeenCalled()
    unsub()
  })
})

// --- HTTP stores tests ---
describe('HTTP stores', () => {
  let mockHttpClient: HttpClient

  beforeEach(() => {
    contextStore.clear()
    mockHttpClient = {
      get: vi.fn(() => Promise.resolve({ data: { users: [] }, status: 200 })),
      post: vi.fn(() => Promise.resolve({ data: { id: '1' }, status: 201 })),
      put: vi.fn(() => Promise.resolve({ data: { updated: true }, status: 200 })),
      patch: vi.fn(() => Promise.resolve({ data: { patched: true }, status: 200 })),
      delete: vi.fn(() => Promise.resolve({ data: null, status: 204 })),
    } as unknown as HttpClient
  })

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  async function getHttpStoresModule(): Promise<typeof import('../stores/http.js')> {
    return await import('../stores/http.js')
  }

  it('createHttpStoresFromClient returns factory methods', async () => {
    const { createHttpStoresFromClient } = await getHttpStoresModule()
    const stores = createHttpStoresFromClient(mockHttpClient)

    expect(stores).toHaveProperty('get')
    expect(stores).toHaveProperty('post')
    expect(stores).toHaveProperty('put')
    expect(stores).toHaveProperty('patch')
    expect(stores).toHaveProperty('delete')
  })

  it('createHttpStoresFromClient GET store calls client.get on execute', async () => {
    const { createHttpStoresFromClient } = await getHttpStoresModule()
    const stores = createHttpStoresFromClient(mockHttpClient)

    const store = stores.get('/api/users')
    expect(store).toHaveProperty('subscribe')
    expect(store).toHaveProperty('execute')

    // Check initial state
    const initial = getValue(store)
    expect(initial).toEqual({ data: null, loading: false, error: null })

    await store.execute()
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/users', undefined)

    const after = getValue(store)
    expect(after.data).toEqual({ users: [] })
    expect(after.loading).toBe(false)
    expect(after.error).toBe(null)
  })

  it('createHttpStoresFromClient POST store calls client.post on execute', async () => {
    const { createHttpStoresFromClient } = await getHttpStoresModule()
    const stores = createHttpStoresFromClient(mockHttpClient)

    const store = stores.post('/api/users', { data: { name: 'Test' } } as RequestConfig)
    await store.execute()
    expect(mockHttpClient.post).toHaveBeenCalled()
  })

  it('createHttpStoresFromClient PUT store calls client.put on execute', async () => {
    const { createHttpStoresFromClient } = await getHttpStoresModule()
    const stores = createHttpStoresFromClient(mockHttpClient)

    const store = stores.put('/api/users/1', { data: { name: 'Updated' } } as RequestConfig)
    await store.execute()
    expect(mockHttpClient.put).toHaveBeenCalled()
  })

  it('createHttpStoresFromClient PATCH store calls client.patch on execute', async () => {
    const { createHttpStoresFromClient } = await getHttpStoresModule()
    const stores = createHttpStoresFromClient(mockHttpClient)

    const store = stores.patch('/api/users/1', { data: { name: 'Patched' } } as RequestConfig)
    await store.execute()
    expect(mockHttpClient.patch).toHaveBeenCalled()
  })

  it('createHttpStoresFromClient DELETE store calls client.delete on execute', async () => {
    const { createHttpStoresFromClient } = await getHttpStoresModule()
    const stores = createHttpStoresFromClient(mockHttpClient)

    const store = stores.delete('/api/users/1')
    await store.execute()
    expect(mockHttpClient.delete).toHaveBeenCalled()
  })

  it('HTTP store handles errors', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('Network error'))

    const { createHttpStoresFromClient } = await getHttpStoresModule()
    const stores = createHttpStoresFromClient(mockHttpClient)

    const store = stores.get('/api/fail')
    await store.execute()

    const state = getValue(store)
    expect(state.data).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error!.message).toBe('Network error')
  })

  it('HTTP store handles non-Error throws', async () => {
    mockHttpClient.get.mockRejectedValue('string error')

    const { createHttpStoresFromClient } = await getHttpStoresModule()
    const stores = createHttpStoresFromClient(mockHttpClient)

    const store = stores.get('/api/fail')
    await store.execute()

    const state = getValue(store)
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error!.message).toBe('string error')
  })

  it('HTTP store reset clears state', async () => {
    const { createHttpStoresFromClient } = await getHttpStoresModule()
    const stores = createHttpStoresFromClient(mockHttpClient)

    const store = stores.get('/api/users')
    await store.execute()

    // data should be populated
    let state = getValue(store)
    expect(state.data).not.toBeNull()

    store.reset()
    state = getValue(store)
    expect(state.data).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })
})

// --- I18n stores tests ---
describe('I18n stores', () => {
  let mockI18nProvider: I18nProvider
  let localeCallbacks: ((locale: string) => void)[]

  beforeEach(() => {
    contextStore.clear()
    localeCallbacks = []
    mockI18nProvider = {
      getLocale: vi.fn(() => 'en'),
      getDirection: vi.fn(() => 'ltr' as const),
      getLocales: vi.fn(() => [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
      ]),
      t: vi.fn((key: string, _values?: InterpolationValues) => `translated:${key}`),
      setLocale: vi.fn(),
      formatNumber: vi.fn((value: number) => String(value)),
      formatDate: vi.fn((_value: Date | number | string) => 'formatted-date'),
      onLocaleChange: vi.fn((cb: (locale: string) => void) => {
        localeCallbacks.push(cb)
        return () => {
          localeCallbacks = localeCallbacks.filter((c) => c !== cb)
        }
      }),
    } as unknown as I18nProvider
  })

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  async function getI18nModule(): Promise<typeof import('../stores/i18n.js')> {
    return await import('../stores/i18n.js')
  }

  it('createI18nStoresFromProvider returns all expected properties', async () => {
    const { createI18nStoresFromProvider } = await getI18nModule()
    const result = createI18nStoresFromProvider(mockI18nProvider)

    expect(result).toHaveProperty('locale')
    expect(result).toHaveProperty('direction')
    expect(result).toHaveProperty('locales')
    expect(result).toHaveProperty('t')
    expect(result).toHaveProperty('setLocale')
    expect(result).toHaveProperty('formatNumber')
    expect(result).toHaveProperty('formatDate')
  })

  it('createI18nStoresFromProvider t delegates to provider.t', async () => {
    const { createI18nStoresFromProvider } = await getI18nModule()
    const result = createI18nStoresFromProvider(mockI18nProvider)

    const translated = result.t('hello.world', { name: 'Test' })
    expect(mockI18nProvider.t).toHaveBeenCalledWith('hello.world', { name: 'Test' })
    expect(translated).toBe('translated:hello.world')
  })

  it('createI18nStoresFromProvider setLocale delegates to provider', async () => {
    const { createI18nStoresFromProvider } = await getI18nModule()
    const result = createI18nStoresFromProvider(mockI18nProvider)

    result.setLocale('es')
    expect(mockI18nProvider.setLocale).toHaveBeenCalledWith('es')
  })

  it('createI18nStoresFromProvider formatNumber delegates to provider', async () => {
    const { createI18nStoresFromProvider } = await getI18nModule()
    const result = createI18nStoresFromProvider(mockI18nProvider)

    result.formatNumber(42, { style: 'currency' } as NumberFormatOptions)
    expect(mockI18nProvider.formatNumber).toHaveBeenCalledWith(42, { style: 'currency' })
  })

  it('createI18nStoresFromProvider formatDate delegates to provider', async () => {
    const { createI18nStoresFromProvider } = await getI18nModule()
    const result = createI18nStoresFromProvider(mockI18nProvider)

    const date = new Date('2024-01-01')
    result.formatDate(date)
    expect(mockI18nProvider.formatDate).toHaveBeenCalledWith(date, undefined)
  })

  it('createI18nStoresFromProvider subscribes to locale changes when store is subscribed to', async () => {
    const { createI18nStoresFromProvider } = await getI18nModule()
    const result = createI18nStoresFromProvider(mockI18nProvider)

    // readable start function is called when the first subscriber attaches
    const unsub = result.locale.subscribe(() => {})
    expect(mockI18nProvider.onLocaleChange).toHaveBeenCalled()
    unsub()
  })
})

// --- Logger stores tests ---
describe('Logger stores', () => {
  let mockLoggerProvider: LoggerProvider
  let mockLogger: Logger

  beforeEach(() => {
    contextStore.clear()
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      withContext: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
    } as unknown as Logger
    mockLoggerProvider = {
      getLogger: vi.fn(() => mockLogger),
      createLogger: vi.fn(() => mockLogger),
      setLevel: vi.fn(),
      getLevel: vi.fn(() => 'info'),
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: vi.fn(() => true),
    } as unknown as LoggerProvider
  })

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  async function getLoggerModule(): Promise<typeof import('../stores/logger.js')> {
    return await import('../stores/logger.js')
  }

  it('createLoggerHelpersFromProvider returns all expected methods', async () => {
    const { createLoggerHelpersFromProvider } = await getLoggerModule()
    const helpers = createLoggerHelpersFromProvider(mockLoggerProvider)

    expect(helpers).toHaveProperty('getLogger')
    expect(helpers).toHaveProperty('createLogger')
    expect(helpers).toHaveProperty('setLevel')
    expect(helpers).toHaveProperty('getLevel')
    expect(helpers).toHaveProperty('enable')
    expect(helpers).toHaveProperty('disable')
    expect(helpers).toHaveProperty('isEnabled')
  })

  it('createLoggerHelpersFromProvider.getLogger delegates to provider', async () => {
    const { createLoggerHelpersFromProvider } = await getLoggerModule()
    const helpers = createLoggerHelpersFromProvider(mockLoggerProvider)

    const logger = helpers.getLogger('test')
    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('test')
    expect(logger).toBe(mockLogger)
  })

  it('createLoggerHelpersFromProvider.createLogger delegates to provider', async () => {
    const { createLoggerHelpersFromProvider } = await getLoggerModule()
    const helpers = createLoggerHelpersFromProvider(mockLoggerProvider)

    helpers.createLogger({ name: 'custom', level: 'debug' } as LoggerConfig)
    expect(mockLoggerProvider.createLogger).toHaveBeenCalledWith({ name: 'custom', level: 'debug' })
  })

  it('createLoggerHelpersFromProvider.setLevel delegates to provider', async () => {
    const { createLoggerHelpersFromProvider } = await getLoggerModule()
    const helpers = createLoggerHelpersFromProvider(mockLoggerProvider)

    helpers.setLevel('debug')
    expect(mockLoggerProvider.setLevel).toHaveBeenCalledWith('debug')
  })

  it('createLoggerHelpersFromProvider.getLevel delegates to provider', async () => {
    const { createLoggerHelpersFromProvider } = await getLoggerModule()
    const helpers = createLoggerHelpersFromProvider(mockLoggerProvider)

    const level = helpers.getLevel()
    expect(mockLoggerProvider.getLevel).toHaveBeenCalled()
    expect(level).toBe('info')
  })

  it('createLoggerHelpersFromProvider.enable/disable/isEnabled delegate', async () => {
    const { createLoggerHelpersFromProvider } = await getLoggerModule()
    const helpers = createLoggerHelpersFromProvider(mockLoggerProvider)

    helpers.enable()
    expect(mockLoggerProvider.enable).toHaveBeenCalled()

    helpers.disable()
    expect(mockLoggerProvider.disable).toHaveBeenCalled()

    const enabled = helpers.isEnabled()
    expect(mockLoggerProvider.isEnabled).toHaveBeenCalled()
    expect(enabled).toBe(true)
  })
})

// --- Router stores tests ---
describe('Router stores', () => {
  let mockRouter: Router
  let routeCallbacks: ((location: RouteLocation) => void)[]

  beforeEach(() => {
    contextStore.clear()
    routeCallbacks = []
    mockRouter = {
      getLocation: vi.fn(() => ({ pathname: '/', hash: '', search: '' })),
      getParams: vi.fn(() => ({})),
      getQuery: vi.fn(() => ({})),
      subscribe: vi.fn((cb: (location: RouteLocation) => void) => {
        routeCallbacks.push(cb)
        return () => {
          routeCallbacks = routeCallbacks.filter((c) => c !== cb)
        }
      }),
      navigate: vi.fn(),
      navigateTo: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      isActive: vi.fn((path: string) => path === '/'),
    } as unknown as Router
  })

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  async function getRouterModule(): Promise<typeof import('../stores/router.js')> {
    return await import('../stores/router.js')
  }

  it('createRouterStoresFromRouter returns all expected properties', async () => {
    const { createRouterStoresFromRouter } = await getRouterModule()
    const result = createRouterStoresFromRouter(mockRouter)

    expect(result).toHaveProperty('location')
    expect(result).toHaveProperty('params')
    expect(result).toHaveProperty('query')
    expect(result).toHaveProperty('pathname')
    expect(result).toHaveProperty('navigate')
    expect(result).toHaveProperty('navigateTo')
    expect(result).toHaveProperty('back')
    expect(result).toHaveProperty('forward')
    expect(result).toHaveProperty('isActive')
  })

  it('createRouterStoresFromRouter navigate delegates to router', async () => {
    const { createRouterStoresFromRouter } = await getRouterModule()
    const result = createRouterStoresFromRouter(mockRouter)

    result.navigate('/about')
    expect(mockRouter.navigate).toHaveBeenCalledWith('/about', undefined)
  })

  it('createRouterStoresFromRouter navigateTo delegates to router', async () => {
    const { createRouterStoresFromRouter } = await getRouterModule()
    const result = createRouterStoresFromRouter(mockRouter)

    result.navigateTo('home', { id: '1' }, { q: 'test' })
    expect(mockRouter.navigateTo).toHaveBeenCalledWith(
      'home',
      { id: '1' },
      { q: 'test' },
      undefined,
    )
  })

  it('createRouterStoresFromRouter back/forward delegate to router', async () => {
    const { createRouterStoresFromRouter } = await getRouterModule()
    const result = createRouterStoresFromRouter(mockRouter)

    result.back()
    expect(mockRouter.back).toHaveBeenCalled()

    result.forward()
    expect(mockRouter.forward).toHaveBeenCalled()
  })

  it('createRouterStoresFromRouter isActive delegates to router', async () => {
    const { createRouterStoresFromRouter } = await getRouterModule()
    const result = createRouterStoresFromRouter(mockRouter)

    result.isActive('/', true)
    expect(mockRouter.isActive).toHaveBeenCalledWith('/', true)
  })

  it('createRouterStoresFromRouter subscribes to router changes when store is subscribed to', async () => {
    const { createRouterStoresFromRouter } = await getRouterModule()
    const result = createRouterStoresFromRouter(mockRouter)

    // readable start function is called when the first subscriber attaches
    const unsub = result.location.subscribe(() => {})
    expect(mockRouter.subscribe).toHaveBeenCalled()
    unsub()
  })
})

// --- State stores tests ---
describe('State stores', () => {
  let mockStore: MoleculeStore<{ count: number }>
  let storeCallbacks: ((state: { count: number }) => void)[]

  beforeEach(() => {
    contextStore.clear()
    storeCallbacks = []
    mockStore = {
      getState: vi.fn(() => ({ count: 0 })),
      setState: vi.fn(),
      subscribe: vi.fn((cb: (state: { count: number }) => void) => {
        storeCallbacks.push(cb)
        return () => {
          storeCallbacks = storeCallbacks.filter((c) => c !== cb)
        }
      }),
    } as unknown as MoleculeStore<{ count: number }>
  })

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  async function getStateModule(): Promise<typeof import('../stores/state.js')> {
    return await import('../stores/state.js')
  }

  it('createStoreReadable creates a readable from molecule store', async () => {
    const { createStoreReadable } = await getStateModule()
    const readable = createStoreReadable(mockStore)

    expect(readable).toHaveProperty('subscribe')
    expect(mockStore.getState).toHaveBeenCalled()
  })

  it('createStoreSelector creates a derived store with selector', async () => {
    const { createStoreSelector } = await getStateModule()
    const selector = (state: { count: number }): number => state.count
    const selected = createStoreSelector(mockStore, selector)

    expect(selected).toHaveProperty('subscribe')
  })

  it('getSetStore returns setState function from store', async () => {
    const { getSetStore } = await getStateModule()
    const setState = getSetStore(mockStore)
    expect(setState).toBe(mockStore.setState)
  })

  it('createStoreAction creates bound action', async () => {
    const { createStoreAction } = await getStateModule()

    const increment = createStoreAction(mockStore, (setState, getState) => (amount: number) => {
      const current = getState()
      setState({ count: current.count + amount })
    })

    increment(5)
    expect(mockStore.getState).toHaveBeenCalled()
    expect(mockStore.setState).toHaveBeenCalledWith({ count: 5 })
  })
})

// --- Storage stores tests ---
describe('Storage stores', () => {
  let mockStorage: StorageProvider

  beforeEach(() => {
    contextStore.clear()
    mockStorage = {
      get: vi.fn(() => Promise.resolve('stored-value')),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
      keys: vi.fn(() => Promise.resolve(['key1', 'key2'])),
    } as unknown as StorageProvider
  })

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  async function getStorageModule(): Promise<typeof import('../stores/storage.js')> {
    return await import('../stores/storage.js')
  }

  it('createStorageStoreFromProvider returns store with expected methods', async () => {
    const { createStorageStoreFromProvider } = await getStorageModule()
    const store = createStorageStoreFromProvider(mockStorage, 'testKey', 'default')

    expect(store).toHaveProperty('subscribe')
    expect(store).toHaveProperty('load')
    expect(store).toHaveProperty('set')
    expect(store).toHaveProperty('remove')
  })

  it('createStorageStoreFromProvider load fetches from storage', async () => {
    const { createStorageStoreFromProvider } = await getStorageModule()
    const store = createStorageStoreFromProvider(mockStorage, 'testKey', 'default')

    await store.load()
    expect(mockStorage.get).toHaveBeenCalledWith('testKey')

    const state = getValue(store)
    expect(state.value).toBe('stored-value')
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('createStorageStoreFromProvider load uses default when storage returns null', async () => {
    mockStorage.get.mockResolvedValue(null)
    const { createStorageStoreFromProvider } = await getStorageModule()
    const store = createStorageStoreFromProvider(mockStorage, 'testKey', 'fallback')

    await store.load()
    const state = getValue(store)
    expect(state.value).toBe('fallback')
  })

  it('createStorageStoreFromProvider load handles errors', async () => {
    mockStorage.get.mockRejectedValue(new Error('Storage error'))
    const { createStorageStoreFromProvider } = await getStorageModule()
    const store = createStorageStoreFromProvider(mockStorage, 'testKey', 'default')

    await store.load()
    const state = getValue(store)
    expect(state.value).toBe('default')
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error!.message).toBe('Storage error')
  })

  it('createStorageStoreFromProvider set writes to storage', async () => {
    const { createStorageStoreFromProvider } = await getStorageModule()
    const store = createStorageStoreFromProvider(mockStorage, 'testKey', 'default')

    await store.set('new-value')
    expect(mockStorage.set).toHaveBeenCalledWith('testKey', 'new-value')

    const state = getValue(store)
    expect(state.value).toBe('new-value')
  })

  it('createStorageStoreFromProvider set handles errors', async () => {
    mockStorage.set.mockRejectedValue(new Error('Write error'))
    const { createStorageStoreFromProvider } = await getStorageModule()
    const store = createStorageStoreFromProvider(mockStorage, 'testKey', 'default')

    await expect(store.set('fail')).rejects.toThrow('Write error')
  })

  it('createStorageStoreFromProvider remove deletes from storage', async () => {
    const { createStorageStoreFromProvider } = await getStorageModule()
    const store = createStorageStoreFromProvider(mockStorage, 'testKey', 'default')

    await store.remove()
    expect(mockStorage.remove).toHaveBeenCalledWith('testKey')

    const state = getValue(store)
    expect(state.value).toBe('default')
  })

  it('createStorageHelpers returns storage utility functions', async () => {
    // Need to set context for this
    const { setStorageContext } = await import('../context.js')
    setStorageContext(mockStorage)

    const { createStorageHelpers } = await getStorageModule()
    const helpers = createStorageHelpers()

    expect(helpers).toHaveProperty('get')
    expect(helpers).toHaveProperty('set')
    expect(helpers).toHaveProperty('remove')
    expect(helpers).toHaveProperty('clear')
    expect(helpers).toHaveProperty('keys')

    await helpers.get('key')
    expect(mockStorage.get).toHaveBeenCalledWith('key')

    await helpers.set('key', 'val')
    expect(mockStorage.set).toHaveBeenCalledWith('key', 'val')

    await helpers.remove('key')
    expect(mockStorage.remove).toHaveBeenCalledWith('key')

    await helpers.clear()
    expect(mockStorage.clear).toHaveBeenCalled()

    await helpers.keys()
    expect(mockStorage.keys).toHaveBeenCalled()
  })
})

// --- Theme stores tests ---
describe('Theme stores', () => {
  let mockThemeProvider: ThemeProvider
  let themeCallbacks: ((theme: Theme) => void)[]

  beforeEach(() => {
    contextStore.clear()
    themeCallbacks = []
    mockThemeProvider = {
      getTheme: vi.fn(() => ({
        name: 'light',
        mode: 'light' as const,
        colors: { background: { primary: '#fff' } },
      })),
      subscribe: vi.fn((cb: (theme: Theme) => void) => {
        themeCallbacks.push(cb)
        return () => {
          themeCallbacks = themeCallbacks.filter((c) => c !== cb)
        }
      }),
      setTheme: vi.fn(),
      getThemes: vi.fn(() => [
        { name: 'light', mode: 'light' },
        { name: 'dark', mode: 'dark' },
      ]),
    } as unknown as ThemeProvider
  })

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  async function getThemeModule(): Promise<typeof import('../stores/theme.js')> {
    return await import('../stores/theme.js')
  }

  it('createThemeStoresFromProvider returns all expected properties', async () => {
    const { createThemeStoresFromProvider } = await getThemeModule()
    const result = createThemeStoresFromProvider(mockThemeProvider)

    expect(result).toHaveProperty('theme')
    expect(result).toHaveProperty('themeName')
    expect(result).toHaveProperty('mode')
    expect(result).toHaveProperty('themes')
    expect(result).toHaveProperty('setTheme')
    expect(result).toHaveProperty('toggleTheme')
  })

  it('createThemeStoresFromProvider setTheme delegates to provider', async () => {
    const { createThemeStoresFromProvider } = await getThemeModule()
    const result = createThemeStoresFromProvider(mockThemeProvider)

    result.setTheme('dark')
    expect(mockThemeProvider.setTheme).toHaveBeenCalledWith('dark')
  })

  it('createThemeStoresFromProvider toggleTheme cycles through themes', async () => {
    const { createThemeStoresFromProvider } = await getThemeModule()
    const result = createThemeStoresFromProvider(mockThemeProvider)

    result.toggleTheme()
    // Current theme is 'light' (index 0), so next should be 'dark' (index 1)
    expect(mockThemeProvider.setTheme).toHaveBeenCalled()
  })

  it('createThemeStoresFromProvider subscribes to theme changes when store is subscribed to', async () => {
    const { createThemeStoresFromProvider } = await getThemeModule()
    const result = createThemeStoresFromProvider(mockThemeProvider)

    // readable start function is called when the first subscriber attaches
    const unsub = result.theme.subscribe(() => {})
    expect(mockThemeProvider.subscribe).toHaveBeenCalled()
    unsub()
  })

  it('createThemeStoresFromProvider themes returns available themes', async () => {
    const { createThemeStoresFromProvider } = await getThemeModule()
    const result = createThemeStoresFromProvider(mockThemeProvider)

    expect(result.themes).toEqual([
      { name: 'light', mode: 'light' },
      { name: 'dark', mode: 'dark' },
    ])
  })

  it('createThemeStoresFromProvider handles missing getThemes', async () => {
    mockThemeProvider.getThemes = undefined
    const { createThemeStoresFromProvider } = await getThemeModule()
    const result = createThemeStoresFromProvider(mockThemeProvider)

    expect(result.themes).toEqual([])
  })
})
