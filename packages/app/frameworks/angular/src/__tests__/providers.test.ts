import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

// Track calls to makeEnvironmentProviders
const makeEnvProvidersCalls: unknown[][] = []

vi.mock('@angular/core', () => ({
  InjectionToken: class InjectionToken {
    _desc: string
    constructor(desc: string) {
      this._desc = desc
    }
  },
  provideEnvironmentInitializer: (initializer: () => void) => ({ _initializer: initializer }),
  provideAppInitializer: (initializer: () => unknown) => ({ _appInitializer: initializer }),
  makeEnvironmentProviders: function mockMakeEnvProviders(providers: unknown[]): unknown {
    makeEnvProvidersCalls.push(providers)
    return { _providers: providers, ɵproviders: providers }
  },
  signal: (initial: unknown) => {
    let value = initial
    const s = (): unknown => value
    s.set = (v: unknown) => {
      value = v
    }
    s.update = (fn: (v: unknown) => unknown) => {
      value = fn(value)
    }
    return s
  },
}))

vi.mock('@molecule/app-auth', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-routing', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-state', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  hasProvider: vi.fn(() => false),
  getProvider: vi.fn(() => undefined),
}))
vi.mock('@molecule/app-storage', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-theme', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
// provideMolecule always includes the renderer rules the ports' components need.
const DOM_PLACEMENT = { _domPlacement: true }
vi.mock('../dom-placement.js', () => ({ provideDomPlacement: () => DOM_PLACEMENT }))

import type { StateProvider } from '@molecule/app-state'
import {
  getProvider as getStateProvider,
  hasProvider as hasStateProvider,
} from '@molecule/app-state'

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
import {
  createTestAuthClient,
  createTestHttpClient,
  createTestI18nProvider,
  createTestLoggerProvider,
  createTestRouter,
  createTestStateProvider,
  createTestStorageProvider,
  createTestTheme,
  createTestThemeProvider,
} from './helpers/test-providers.js'

describe('providers', () => {
  beforeEach(() => {
    makeEnvProvidersCalls.length = 0
  })

  describe('provideState', () => {
    it('should create environment providers with the state provider', () => {
      const mockStateProvider: StateProvider = createTestStateProvider()
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
      const mockAuthClient: AuthClient<unknown> = createTestAuthClient()
      const result = provideAuth(mockAuthClient)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([{ provide: AUTH_CLIENT, useValue: mockAuthClient }])
      expect(result).toBeDefined()
    })
  })

  describe('provideTheme', () => {
    it('should create environment providers with the theme provider', () => {
      const mockThemeProvider: ThemeProvider = createTestThemeProvider(
        createTestTheme('light', 'light'),
      )
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
      const mockRouter: Router = createTestRouter()
      const result = provideRouter(mockRouter)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      // With the DOM placement rules: RoutedView renders the page with no element of its own.
      expect(makeEnvProvidersCalls[0]).toEqual([
        { provide: ROUTER, useValue: mockRouter },
        DOM_PLACEMENT,
      ])
      expect(result).toBeDefined()
    })

    it('should provide the router a function returns, built where the router is injected', () => {
      const mockRouter: Router = createTestRouter()
      const build = (): Router => mockRouter
      provideRouter(build)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([
        { provide: ROUTER, useFactory: build },
        DOM_PLACEMENT,
      ])
    })
  })

  describe('provideI18n', () => {
    it('should create environment providers with the i18n provider', () => {
      const mockI18n: I18nProvider = createTestI18nProvider()
      const result = provideI18n(mockI18n)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([{ provide: I18N_PROVIDER, useValue: mockI18n }])
      expect(result).toBeDefined()
    })
  })

  describe('provideHttp', () => {
    it('should create environment providers with the HTTP client', () => {
      const mockHttpClient: HttpClient = createTestHttpClient()
      const result = provideHttp(mockHttpClient)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      expect(makeEnvProvidersCalls[0]).toEqual([{ provide: HTTP_CLIENT, useValue: mockHttpClient }])
      expect(result).toBeDefined()
    })
  })

  describe('provideStorage', () => {
    it('should create environment providers with the storage provider', () => {
      const mockStorageProvider: StorageProvider = createTestStorageProvider()
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
      const mockLoggerProvider: LoggerProvider = createTestLoggerProvider()
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
        state: createTestStateProvider(),
        auth: createTestAuthClient(),
        theme: createTestThemeProvider(createTestTheme('light', 'light')),
        router: createTestRouter(),
        i18n: createTestI18nProvider(),
        http: createTestHttpClient(),
        storage: createTestStorageProvider(),
        logger: createTestLoggerProvider(),
      }

      provideMolecule(config)

      expect(makeEnvProvidersCalls).toHaveLength(1)
      const providersArg = makeEnvProvidersCalls[0]
      // The DOM placement rules, 8 value providers, the environment initializer for i18n locale
      // reactivity and the app initializer that holds bootstrap for the session (the default with `auth`)
      expect(providersArg).toHaveLength(11)
      expect(providersArg[0]).toBe(DOM_PLACEMENT)
      expect(providersArg).toContainEqual({ _appInitializer: expect.any(Function) })
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
        state: createTestStateProvider(),
        auth: createTestAuthClient(),
      }

      provideMolecule(config)

      const providersArg = makeEnvProvidersCalls[0]
      // The DOM placement rules, the two value providers and the session hold `auth` brings by default.
      expect(providersArg).toHaveLength(4)
      expect(providersArg).toContainEqual({ provide: STATE_PROVIDER, useValue: config.state })
      expect(providersArg).toContainEqual({ provide: AUTH_CLIENT, useValue: config.auth })
      expect(providersArg).toContainEqual({ _appInitializer: expect.any(Function) })
    })

    it('holds bootstrap for the session only while awaitSession is not false', () => {
      const auth = createTestAuthClient()
      provideMolecule({ auth, awaitSession: false })
      expect(makeEnvProvidersCalls[0]).toEqual([
        DOM_PLACEMENT,
        { provide: AUTH_CLIENT, useValue: auth },
      ])
    })

    it('should handle empty configuration', () => {
      provideMolecule({})

      // Only the DOM placement rules, which every app gets.
      const providersArg = makeEnvProvidersCalls[0]
      expect(providersArg).toEqual([DOM_PLACEMENT])
    })

    it('should fall back to the bonded state provider when none is configured', () => {
      const bondedProvider: StateProvider = createTestStateProvider()
      vi.mocked(hasStateProvider).mockReturnValueOnce(true)
      vi.mocked(getStateProvider).mockReturnValueOnce(bondedProvider)

      provideMolecule({})

      const providersArg = makeEnvProvidersCalls[0]
      expect(providersArg).toEqual([
        DOM_PLACEMENT,
        { provide: STATE_PROVIDER, useValue: bondedProvider },
      ])
    })

    it('should handle single provider configuration', () => {
      const config = {
        theme: createTestThemeProvider(createTestTheme('light', 'light')),
      }

      provideMolecule(config)

      const providersArg = makeEnvProvidersCalls[0]
      expect(providersArg).toEqual([
        DOM_PLACEMENT,
        { provide: THEME_PROVIDER, useValue: config.theme },
      ])
    })

    it('should not include undefined providers', () => {
      const config = {
        state: undefined,
        auth: createTestAuthClient(),
        theme: undefined,
      }

      provideMolecule(config)

      const providersArg = makeEnvProvidersCalls[0]
      expect(providersArg).toEqual([
        DOM_PLACEMENT,
        { provide: AUTH_CLIENT, useValue: config.auth },
        { _appInitializer: expect.any(Function) },
      ])
    })
  })
})
