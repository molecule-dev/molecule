import { beforeEach, describe, expect, it, vi } from 'vitest'

// Track calls to makeEnvironmentProviders
const makeEnvProvidersCalls: unknown[][] = []

vi.mock('@angular/core', () => ({
  InjectionToken: class InjectionToken {
    _desc: string
    constructor(desc: string) {
      this._desc = desc
    }
  },
  makeEnvironmentProviders: function mockMakeEnvProviders(providers: unknown[]) {
    makeEnvProvidersCalls.push(providers)
    return { _providers: providers, ɵproviders: providers }
  },
}))

vi.mock('@molecule/app-auth', () => ({}))
vi.mock('@molecule/app-http', () => ({}))
vi.mock('@molecule/app-i18n', () => ({}))
vi.mock('@molecule/app-logger', () => ({}))
vi.mock('@molecule/app-routing', () => ({}))
vi.mock('@molecule/app-state', () => ({}))
vi.mock('@molecule/app-storage', () => ({}))
vi.mock('@molecule/app-theme', () => ({}))

import {
  provideAuth,
  provideHttp,
  provideI18n,
  provideLogger,
  provideMolecule,
  provideRouter,
  provideState,
  provideStorage,
  provideTheme,
} from '../providers.js'
import {
  AUTH_CLIENT,
  HTTP_CLIENT,
  I18N_PROVIDER,
  LOGGER_PROVIDER,
  ROUTER,
  STATE_PROVIDER,
  STORAGE_PROVIDER,
  THEME_PROVIDER,
} from '../tokens.js'

describe('providers', () => {
  beforeEach(() => {
    makeEnvProvidersCalls.length = 0
  })

  describe('provideState', () => {
    it('should create environment providers with the state provider', () => {
      const mockStateProvider = { createStore: vi.fn() } as unknown
      const result = provideState(mockStateProvider)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([
        { provide: STATE_PROVIDER, useValue: mockStateProvider },
      ])
      expect(result).toBeDefined()
    })
  })

  describe('provideAuth', () => {
    it('should create environment providers with the auth client', () => {
      const mockAuthClient = { login: vi.fn(), logout: vi.fn() } as unknown
      const result = provideAuth(mockAuthClient)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([{ provide: AUTH_CLIENT, useValue: mockAuthClient }])
      expect(result).toBeDefined()
    })
  })

  describe('provideTheme', () => {
    it('should create environment providers with the theme provider', () => {
      const mockThemeProvider = { getTheme: vi.fn() } as unknown
      const result = provideTheme(mockThemeProvider)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([
        { provide: THEME_PROVIDER, useValue: mockThemeProvider },
      ])
      expect(result).toBeDefined()
    })
  })

  describe('provideRouter', () => {
    it('should create environment providers with the router', () => {
      const mockRouter = { navigate: vi.fn() } as unknown
      const result = provideRouter(mockRouter)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([{ provide: ROUTER, useValue: mockRouter }])
      expect(result).toBeDefined()
    })
  })

  describe('provideI18n', () => {
    it('should create environment providers with the i18n provider', () => {
      const mockI18n = { t: vi.fn() } as unknown
      const result = provideI18n(mockI18n)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([{ provide: I18N_PROVIDER, useValue: mockI18n }])
      expect(result).toBeDefined()
    })
  })

  describe('provideHttp', () => {
    it('should create environment providers with the HTTP client', () => {
      const mockHttpClient = { get: vi.fn() } as unknown
      const result = provideHttp(mockHttpClient)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([{ provide: HTTP_CLIENT, useValue: mockHttpClient }])
      expect(result).toBeDefined()
    })
  })

  describe('provideStorage', () => {
    it('should create environment providers with the storage provider', () => {
      const mockStorageProvider = { get: vi.fn() } as unknown
      const result = provideStorage(mockStorageProvider)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([
        { provide: STORAGE_PROVIDER, useValue: mockStorageProvider },
      ])
      expect(result).toBeDefined()
    })
  })

  describe('provideLogger', () => {
    it('should create environment providers with the logger provider', () => {
      const mockLoggerProvider = { getLogger: vi.fn() } as unknown
      const result = provideLogger(mockLoggerProvider)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([
        { provide: LOGGER_PROVIDER, useValue: mockLoggerProvider },
      ])
      expect(result).toBeDefined()
    })
  })

  describe('provideMolecule', () => {
    it('should create environment providers with all configured providers', () => {
      const config = {
        state: { createStore: vi.fn() } as unknown,
        auth: { login: vi.fn() } as unknown,
        theme: { getTheme: vi.fn() } as unknown,
        router: { navigate: vi.fn() } as unknown,
        i18n: { t: vi.fn() } as unknown,
        http: { get: vi.fn() } as unknown,
        storage: { get: vi.fn() } as unknown,
        logger: { getLogger: vi.fn() } as unknown,
      }

      provideMolecule(config)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      const providersArg = makeEnvProvidersCalls[0]
      expect(providersArg).toHaveLength(8)
      expect(providersArg).toContainEqual({ provide: STATE_PROVIDER, useValue: config.state })
      expect(providersArg).toContainEqual({ provide: AUTH_CLIENT, useValue: config.auth })
      expect(providersArg).toContainEqual({ provide: THEME_PROVIDER, useValue: config.theme })
      expect(providersArg).toContainEqual({ provide: ROUTER, useValue: config.router })
      expect(providersArg).toContainEqual({ provide: I18N_PROVIDER, useValue: config.i18n })
      expect(providersArg).toContainEqual({ provide: HTTP_CLIENT, useValue: config.http })
      expect(providersArg).toContainEqual({ provide: STORAGE_PROVIDER, useValue: config.storage })
      expect(providersArg).toContainEqual({ provide: LOGGER_PROVIDER, useValue: config.logger })
    })

    it('should only include providers that are configured', () => {
      const config = {
        state: { createStore: vi.fn() } as unknown,
        auth: { login: vi.fn() } as unknown,
      }

      provideMolecule(config)

      const providersArg = makeEnvProvidersCalls[0]
      expect(providersArg).toHaveLength(2)
      expect(providersArg).toContainEqual({ provide: STATE_PROVIDER, useValue: config.state })
      expect(providersArg).toContainEqual({ provide: AUTH_CLIENT, useValue: config.auth })
    })

    it('should handle empty configuration', () => {
      provideMolecule({})

      const providersArg = makeEnvProvidersCalls[0]
      expect(providersArg).toHaveLength(0)
    })

    it('should handle single provider configuration', () => {
      const config = {
        theme: { getTheme: vi.fn() } as unknown,
      }

      provideMolecule(config)

      const providersArg = makeEnvProvidersCalls[0]
      expect(providersArg).toHaveLength(1)
      expect(providersArg[0]).toEqual({ provide: THEME_PROVIDER, useValue: config.theme })
    })

    it('should not include undefined providers', () => {
      const config = {
        state: undefined,
        auth: { login: vi.fn() } as unknown,
        theme: undefined,
      }

      provideMolecule(config)

      const providersArg = makeEnvProvidersCalls[0]
      expect(providersArg).toHaveLength(1)
      expect(providersArg[0]).toEqual({ provide: AUTH_CLIENT, useValue: config.auth })
    })
  })
})
