import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

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

describe('Svelte context', () => {
  beforeEach(() => {
    contextStore.clear()
  })

  describe('setMoleculeContext', () => {
    it('should set all provided providers in context', () => {
      const mockState = { createStore: vi.fn() } as unknown as StateProvider
      const mockAuth = { login: vi.fn(), getState: vi.fn() } as unknown as AuthClient<unknown>
      const mockTheme = { getTheme: vi.fn(), subscribe: vi.fn() } as unknown as ThemeProvider
      const mockRouter = { navigate: vi.fn(), getLocation: vi.fn() } as unknown as Router
      const mockI18n = { t: vi.fn(), getLocale: vi.fn() } as unknown as I18nProvider
      const mockHttp = { get: vi.fn(), post: vi.fn() } as unknown as HttpClient
      const mockStorage = { get: vi.fn(), set: vi.fn() } as unknown as StorageProvider
      const mockLogger = { getLogger: vi.fn() } as unknown as LoggerProvider

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
      const mockAuth = { login: vi.fn(), getState: vi.fn() } as unknown as AuthClient<unknown>
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
      const mockState = { createStore: vi.fn() } as unknown as StateProvider
      setStateContext(mockState)
      expect(contextStore.size).toBe(1)
    })

    it('setAuthContext should store auth client', () => {
      const mockAuth = { login: vi.fn() } as unknown as AuthClient<unknown>
      setAuthContext(mockAuth)
      expect(contextStore.size).toBe(1)
    })

    it('setThemeContext should store theme provider', () => {
      const mockTheme = { getTheme: vi.fn() } as unknown as ThemeProvider
      setThemeContext(mockTheme)
      expect(contextStore.size).toBe(1)
    })

    it('setRouterContext should store router', () => {
      const mockRouter = { navigate: vi.fn() } as unknown as Router
      setRouterContext(mockRouter)
      expect(contextStore.size).toBe(1)
    })

    it('setI18nContext should store i18n provider', () => {
      const mockI18n = { t: vi.fn() } as unknown as I18nProvider
      setI18nContext(mockI18n)
      expect(contextStore.size).toBe(1)
    })

    it('setHttpContext should store http client', () => {
      const mockHttp = { get: vi.fn() } as unknown as HttpClient
      setHttpContext(mockHttp)
      expect(contextStore.size).toBe(1)
    })

    it('setStorageContext should store storage provider', () => {
      const mockStorage = { get: vi.fn() } as unknown as StorageProvider
      setStorageContext(mockStorage)
      expect(contextStore.size).toBe(1)
    })

    it('setLoggerContext should store logger provider', () => {
      const mockLogger = { getLogger: vi.fn() } as unknown as LoggerProvider
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
      expect(() => getRouter()).toThrow('Router not found in context')
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
      const mockState = { createStore: vi.fn() } as unknown as StateProvider
      setMoleculeContext({ state: mockState })
      expect(getStateProvider()).toBe(mockState)
    })

    it('getAuthClient returns the auth client after setting', () => {
      const mockAuth = { login: vi.fn() } as unknown as AuthClient<unknown>
      setMoleculeContext({ auth: mockAuth })
      expect(getAuthClient()).toBe(mockAuth)
    })

    it('getThemeProvider returns the theme provider after setting', () => {
      const mockTheme = { getTheme: vi.fn() } as unknown as ThemeProvider
      setMoleculeContext({ theme: mockTheme })
      expect(getThemeProvider()).toBe(mockTheme)
    })

    it('getRouter returns the router after setting', () => {
      const mockRouter = { navigate: vi.fn() } as unknown as Router
      setMoleculeContext({ router: mockRouter })
      expect(getRouter()).toBe(mockRouter)
    })

    it('getI18nProvider returns the i18n provider after setting', () => {
      const mockI18n = { t: vi.fn() } as unknown as I18nProvider
      setMoleculeContext({ i18n: mockI18n })
      expect(getI18nProvider()).toBe(mockI18n)
    })

    it('getHttpClient returns the http client after setting', () => {
      const mockHttp = { get: vi.fn() } as unknown as HttpClient
      setMoleculeContext({ http: mockHttp })
      expect(getHttpClient()).toBe(mockHttp)
    })

    it('getStorageProvider returns the storage provider after setting', () => {
      const mockStorage = { get: vi.fn() } as unknown as StorageProvider
      setMoleculeContext({ storage: mockStorage })
      expect(getStorageProvider()).toBe(mockStorage)
    })

    it('getLoggerProvider returns the logger provider after setting', () => {
      const mockLogger = { getLogger: vi.fn() } as unknown as LoggerProvider
      setMoleculeContext({ logger: mockLogger })
      expect(getLoggerProvider()).toBe(mockLogger)
    })
  })
})
