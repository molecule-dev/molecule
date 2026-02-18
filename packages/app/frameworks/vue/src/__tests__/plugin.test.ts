/**
 * Tests for plugin.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Vue
vi.mock('vue', () => ({
  inject: vi.fn(),
  ref: vi.fn((v: unknown) => ({ value: v })),
  shallowRef: vi.fn((v: unknown) => ({ value: v })),
  computed: vi.fn((fn: () => unknown) => ({ value: fn() })),
  onMounted: vi.fn(),
  onUnmounted: vi.fn(),
  watch: vi.fn(),
}))

// Mock all molecule packages
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
  AuthKey,
  HttpKey,
  I18nKey,
  LoggerKey,
  RouterKey,
  StateKey,
  StorageKey,
  ThemeKey,
} from '../injection-keys.js'
import {
  createAuthPlugin,
  createHttpPlugin,
  createI18nPlugin,
  createLoggerPlugin,
  createRouterPlugin,
  createStatePlugin,
  createStoragePlugin,
  createThemePlugin,
  moleculePlugin,
} from '../plugin.js'

interface MockApp {
  provide: ReturnType<typeof vi.fn>
  component: ReturnType<typeof vi.fn>
  directive: ReturnType<typeof vi.fn>
  use: ReturnType<typeof vi.fn>
  mixin: ReturnType<typeof vi.fn>
  mount: ReturnType<typeof vi.fn>
  unmount: ReturnType<typeof vi.fn>
  config: {
    globalProperties: Record<string, unknown>
    errorHandler: undefined
    warnHandler: undefined
    compilerOptions: Record<string, unknown>
    performance: boolean
    optionMergeStrategies: Record<string, unknown>
  }
  version: string
  runWithContext: ReturnType<typeof vi.fn>
}

function createMockApp(): MockApp {
  return {
    provide: vi.fn(),
    component: vi.fn(),
    directive: vi.fn(),
    use: vi.fn(),
    mixin: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
    config: {
      globalProperties: {},
      errorHandler: undefined,
      warnHandler: undefined,
      compilerOptions: {},
      performance: false,
      optionMergeStrategies: {},
    },
    version: '3.5.0',
    runWithContext: vi.fn(),
  }
}

describe('moleculePlugin', () => {
  let mockApp: ReturnType<typeof createMockApp>

  beforeEach(() => {
    mockApp = createMockApp()
  })

  it('has an install method', () => {
    expect(typeof moleculePlugin.install).toBe('function')
  })

  it('provides state when given in options', () => {
    const mockState = { createStore: vi.fn() }
    moleculePlugin.install!(mockApp as never, { state: mockState as never })
    expect(mockApp.provide).toHaveBeenCalledWith(StateKey, mockState)
  })

  it('provides auth when given in options', () => {
    const mockAuth = { login: vi.fn(), logout: vi.fn() }
    moleculePlugin.install!(mockApp as never, { auth: mockAuth as never })
    expect(mockApp.provide).toHaveBeenCalledWith(AuthKey, mockAuth)
  })

  it('provides theme when given in options', () => {
    const mockTheme = { getTheme: vi.fn(), setTheme: vi.fn() }
    moleculePlugin.install!(mockApp as never, { theme: mockTheme as never })
    expect(mockApp.provide).toHaveBeenCalledWith(ThemeKey, mockTheme)
  })

  it('provides router when given in options', () => {
    const mockRouter = { navigate: vi.fn(), back: vi.fn() }
    moleculePlugin.install!(mockApp as never, { router: mockRouter as never })
    expect(mockApp.provide).toHaveBeenCalledWith(RouterKey, mockRouter)
  })

  it('provides i18n when given in options', () => {
    const mockI18n = { t: vi.fn(), setLocale: vi.fn() }
    moleculePlugin.install!(mockApp as never, { i18n: mockI18n as never })
    expect(mockApp.provide).toHaveBeenCalledWith(I18nKey, mockI18n)
  })

  it('provides http when given in options', () => {
    const mockHttp = { get: vi.fn(), post: vi.fn() }
    moleculePlugin.install!(mockApp as never, { http: mockHttp as never })
    expect(mockApp.provide).toHaveBeenCalledWith(HttpKey, mockHttp)
  })

  it('provides storage when given in options', () => {
    const mockStorage = { get: vi.fn(), set: vi.fn() }
    moleculePlugin.install!(mockApp as never, { storage: mockStorage as never })
    expect(mockApp.provide).toHaveBeenCalledWith(StorageKey, mockStorage)
  })

  it('provides logger when given in options', () => {
    const mockLogger = { getLogger: vi.fn(), createLogger: vi.fn() }
    moleculePlugin.install!(mockApp as never, { logger: mockLogger as never })
    expect(mockApp.provide).toHaveBeenCalledWith(LoggerKey, mockLogger)
  })

  it('does not provide services that are not given in options', () => {
    moleculePlugin.install!(mockApp as never, {})
    expect(mockApp.provide).not.toHaveBeenCalled()
  })

  it('defaults to empty options when none provided', () => {
    moleculePlugin.install!(mockApp as never, undefined as never)
    expect(mockApp.provide).not.toHaveBeenCalled()
  })

  it('provides multiple services at once', () => {
    const mockState = { createStore: vi.fn() }
    const mockAuth = { login: vi.fn() }
    const mockTheme = { getTheme: vi.fn() }

    moleculePlugin.install!(mockApp as never, {
      state: mockState as never,
      auth: mockAuth as never,
      theme: mockTheme as never,
    })

    expect(mockApp.provide).toHaveBeenCalledTimes(3)
    expect(mockApp.provide).toHaveBeenCalledWith(StateKey, mockState)
    expect(mockApp.provide).toHaveBeenCalledWith(AuthKey, mockAuth)
    expect(mockApp.provide).toHaveBeenCalledWith(ThemeKey, mockTheme)
  })
})

describe('createStatePlugin', () => {
  it('returns a plugin that provides state', () => {
    const mockState = { createStore: vi.fn() }
    const plugin = createStatePlugin(mockState as never)
    const mockApp = createMockApp()
    plugin.install!(mockApp as never)
    expect(mockApp.provide).toHaveBeenCalledWith(StateKey, mockState)
  })
})

describe('createAuthPlugin', () => {
  it('returns a plugin that provides auth', () => {
    const mockAuth = { login: vi.fn() }
    const plugin = createAuthPlugin(mockAuth as never)
    const mockApp = createMockApp()
    plugin.install!(mockApp as never)
    expect(mockApp.provide).toHaveBeenCalledWith(AuthKey, mockAuth)
  })
})

describe('createThemePlugin', () => {
  it('returns a plugin that provides theme', () => {
    const mockTheme = { getTheme: vi.fn() }
    const plugin = createThemePlugin(mockTheme as never)
    const mockApp = createMockApp()
    plugin.install!(mockApp as never)
    expect(mockApp.provide).toHaveBeenCalledWith(ThemeKey, mockTheme)
  })
})

describe('createRouterPlugin', () => {
  it('returns a plugin that provides router', () => {
    const mockRouter = { navigate: vi.fn() }
    const plugin = createRouterPlugin(mockRouter as never)
    const mockApp = createMockApp()
    plugin.install!(mockApp as never)
    expect(mockApp.provide).toHaveBeenCalledWith(RouterKey, mockRouter)
  })
})

describe('createI18nPlugin', () => {
  it('returns a plugin that provides i18n', () => {
    const mockI18n = { t: vi.fn() }
    const plugin = createI18nPlugin(mockI18n as never)
    const mockApp = createMockApp()
    plugin.install!(mockApp as never)
    expect(mockApp.provide).toHaveBeenCalledWith(I18nKey, mockI18n)
  })
})

describe('createHttpPlugin', () => {
  it('returns a plugin that provides http', () => {
    const mockHttp = { get: vi.fn() }
    const plugin = createHttpPlugin(mockHttp as never)
    const mockApp = createMockApp()
    plugin.install!(mockApp as never)
    expect(mockApp.provide).toHaveBeenCalledWith(HttpKey, mockHttp)
  })
})

describe('createStoragePlugin', () => {
  it('returns a plugin that provides storage', () => {
    const mockStorage = { get: vi.fn() }
    const plugin = createStoragePlugin(mockStorage as never)
    const mockApp = createMockApp()
    plugin.install!(mockApp as never)
    expect(mockApp.provide).toHaveBeenCalledWith(StorageKey, mockStorage)
  })
})

describe('createLoggerPlugin', () => {
  it('returns a plugin that provides logger', () => {
    const mockLogger = { getLogger: vi.fn() }
    const plugin = createLoggerPlugin(mockLogger as never)
    const mockApp = createMockApp()
    plugin.install!(mockApp as never)
    expect(mockApp.provide).toHaveBeenCalledWith(LoggerKey, mockLogger)
  })
})
