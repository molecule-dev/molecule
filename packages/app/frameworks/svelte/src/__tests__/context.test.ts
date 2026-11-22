import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import { createFetchClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import { createConsoleLoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import { createMemoryRouter } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import { createSimpleStateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import { createMemoryStorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'
import { createLightTheme } from '@molecule/app-theme'

// Mock svelte context
const contextStore = new Map<symbol, unknown>()

vi.mock('svelte', () => ({
  getContext: vi.fn((key: symbol) => contextStore.get(key)),
  setContext: vi.fn((key: symbol, value: unknown) => {
    contextStore.set(key, value)
  }),
}))

import {
  getAuthClient,
  getHttpClient,
  getI18nProvider,
  getLoggerProvider,
  getRouter,
  getStateProvider,
  getStorageProvider,
  getThemeProvider,
  setAuthContext,
  setHttpContext,
  setI18nContext,
  setLoggerContext,
  setMoleculeContext,
  setRouterContext,
  setStateContext,
  setStorageContext,
  setThemeContext,
} from '../context.js'

// Real provider instances of each contract: this suite only asserts that the
// context setters/getters carry the value through, so a genuine provider is the
// typed stand-in for a partial mock. The theme provider has no simple factory;
// its four methods are written out here.

/**
 * A `ThemeProvider` over the base light theme.
 *
 * @returns The provider.
 */
const createMockThemeProvider = (): ThemeProvider => ({
  getTheme: () => createLightTheme(),
  setTheme: () => {},
  toggleMode: () => {},
  subscribe: () => () => {},
})

/**
 * A real auth client with in-memory storage.
 *
 * @returns The client.
 */
const createMockAuthClient = (): AuthClient<unknown> => createJWTAuthClient({ storage: 'memory' })

describe('Svelte context', () => {
  beforeEach(() => {
    contextStore.clear()
  })

  describe('setMoleculeContext', () => {
    it('should set all provided providers in context', () => {
      const mockState: StateProvider = createSimpleStateProvider()
      const mockAuth: AuthClient<unknown> = createMockAuthClient()
      const mockTheme: ThemeProvider = createMockThemeProvider()
      const mockRouter: Router = createMemoryRouter()
      const mockI18n: I18nProvider = createSimpleI18nProvider()
      const mockHttp: HttpClient = createFetchClient()
      const mockStorage: StorageProvider = createMemoryStorageProvider()
      const mockLogger: LoggerProvider = createConsoleLoggerProvider()

      setMoleculeContext({
        state: mockState,
        auth: mockAuth,
        theme: mockTheme,
        router: mockRouter,
        i18n: mockI18n,
        http: mockHttp,
        storage: mockStorage,
        logger: mockLogger,
      })

      // All eight providers should be set
      expect(contextStore.size).toBe(8)
    })

    it('should only set provided providers', () => {
      const mockAuth: AuthClient<unknown> = createMockAuthClient()
      setMoleculeContext({ auth: mockAuth })
      expect(contextStore.size).toBe(1)
    })

    it('should not set context for undefined providers', () => {
      setMoleculeContext({})
      expect(contextStore.size).toBe(0)
    })
  })

  describe('individual setters', () => {
    it('setStateContext should store state provider', () => {
      const mockState: StateProvider = createSimpleStateProvider()
      setStateContext(mockState)
      expect(contextStore.size).toBe(1)
    })

    it('setAuthContext should store auth client', () => {
      const mockAuth: AuthClient<unknown> = createMockAuthClient()
      setAuthContext(mockAuth)
      expect(contextStore.size).toBe(1)
    })

    it('setThemeContext should store theme provider', () => {
      const mockTheme: ThemeProvider = createMockThemeProvider()
      setThemeContext(mockTheme)
      expect(contextStore.size).toBe(1)
    })

    it('setRouterContext should store router', () => {
      const mockRouter: Router = createMemoryRouter()
      setRouterContext(mockRouter)
      expect(contextStore.size).toBe(1)
    })

    it('setI18nContext should store i18n provider', () => {
      const mockI18n: I18nProvider = createSimpleI18nProvider()
      setI18nContext(mockI18n)
      expect(contextStore.size).toBe(1)
    })

    it('setHttpContext should store http client', () => {
      const mockHttp: HttpClient = createFetchClient()
      setHttpContext(mockHttp)
      expect(contextStore.size).toBe(1)
    })

    it('setStorageContext should store storage provider', () => {
      const mockStorage: StorageProvider = createMemoryStorageProvider()
      setStorageContext(mockStorage)
      expect(contextStore.size).toBe(1)
    })

    it('setLoggerContext should store logger provider', () => {
      const mockLogger: LoggerProvider = createConsoleLoggerProvider()
      setLoggerContext(mockLogger)
      expect(contextStore.size).toBe(1)
    })
  })

  describe('getters throw when provider not in context', () => {
    it('getStateProvider should throw if not in context', () => {
      expect(() => getStateProvider()).toThrow('State provider not found in context')
    })

    it('getAuthClient should throw if not in context', () => {
      expect(() => getAuthClient()).toThrow('Auth client not found in context')
    })

    it('getThemeProvider should throw if not in context', () => {
      expect(() => getThemeProvider()).toThrow('Theme provider not found in context')
    })

    it('getRouter should throw if not in context', () => {
      expect(() => getRouter()).toThrow(/^No router here\. /)
    })

    it('getI18nProvider should throw if not in context', () => {
      expect(() => getI18nProvider()).toThrow('I18n provider not found in context')
    })

    it('getHttpClient should throw if not in context', () => {
      expect(() => getHttpClient()).toThrow('HTTP client not found in context')
    })

    it('getStorageProvider should throw if not in context', () => {
      expect(() => getStorageProvider()).toThrow('Storage provider not found in context')
    })

    it('getLoggerProvider should throw if not in context', () => {
      expect(() => getLoggerProvider()).toThrow('Logger provider not found in context')
    })
  })

  describe('getters return provider when set', () => {
    it('getStateProvider returns the state provider after setting', () => {
      const mockState: StateProvider = createSimpleStateProvider()
      setMoleculeContext({ state: mockState })
      expect(getStateProvider()).toBe(mockState)
    })

    it('getAuthClient returns the auth client after setting', () => {
      const mockAuth: AuthClient<unknown> = createMockAuthClient()
      setMoleculeContext({ auth: mockAuth })
      expect(getAuthClient()).toBe(mockAuth)
    })

    it('getThemeProvider returns the theme provider after setting', () => {
      const mockTheme: ThemeProvider = createMockThemeProvider()
      setMoleculeContext({ theme: mockTheme })
      expect(getThemeProvider()).toBe(mockTheme)
    })

    it('getRouter returns the router after setting', () => {
      const mockRouter: Router = createMemoryRouter()
      setMoleculeContext({ router: mockRouter })
      expect(getRouter()).toBe(mockRouter)
    })

    it('getI18nProvider returns the i18n provider after setting', () => {
      const mockI18n: I18nProvider = createSimpleI18nProvider()
      setMoleculeContext({ i18n: mockI18n })
      expect(getI18nProvider()).toBe(mockI18n)
    })

    it('getHttpClient returns the http client after setting', () => {
      const mockHttp: HttpClient = createFetchClient()
      setMoleculeContext({ http: mockHttp })
      expect(getHttpClient()).toBe(mockHttp)
    })

    it('getStorageProvider returns the storage provider after setting', () => {
      const mockStorage: StorageProvider = createMemoryStorageProvider()
      setMoleculeContext({ storage: mockStorage })
      expect(getStorageProvider()).toBe(mockStorage)
    })

    it('getLoggerProvider returns the logger provider after setting', () => {
      const mockLogger: LoggerProvider = createConsoleLoggerProvider()
      setMoleculeContext({ logger: mockLogger })
      expect(getLoggerProvider()).toBe(mockLogger)
    })
  })
})
