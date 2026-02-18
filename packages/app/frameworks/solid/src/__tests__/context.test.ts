import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mock solid-js ---
// Track what contexts are set via Provider components
const contextValues = new Map<symbol, unknown>()

vi.mock('solid-js', () => {
  const contextRegistry = new Map<symbol, unknown>()
  let contextIdCounter = 0

  return {
    createContext: vi.fn((defaultValue?: unknown) => {
      const id = Symbol(`context-${contextIdCounter++}`)
      const ctx = {
        id,
        defaultValue,
        Provider: vi.fn(({ value, children }: { value: unknown; children: unknown }) => {
          contextValues.set(id, value)
          return children
        }),
      }
      contextRegistry.set(id, ctx)
      return ctx
    }),
    useContext: vi.fn((ctx: { id: symbol; defaultValue: unknown }) => {
      return contextValues.get(ctx.id) ?? ctx.defaultValue
    }),
    createSignal: vi.fn(<T>(initial: T) => {
      let value = initial
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      const getter = () => value
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
      fn()
    }),
    onCleanup: vi.fn(),
    createMemo: vi.fn((fn: () => unknown) => fn),
    createResource: vi.fn(() => [() => undefined, { loading: false }]),
  }
})

import {
  AuthContext,
  getAuthClient,
  getHttpClient,
  getI18nProvider,
  getLoggerProvider,
  getRouter,
  getStateProvider,
  getStorageProvider,
  getThemeProvider,
  HttpContext,
  I18nContext,
  LoggerContext,
  RouterContext,
  StateContext,
  StorageContext,
  ThemeContext,
} from '../context.js'

describe('Solid context', () => {
  beforeEach(() => {
    contextValues.clear()
  })

  describe('getters throw when provider not in context', () => {
    it('getStateProvider should throw if not in context', () => {
      expect(() => getStateProvider()).toThrow(
        'getStateProvider must be used within a MoleculeProvider with state configured',
      )
    })

    it('getAuthClient should throw if not in context', () => {
      expect(() => getAuthClient()).toThrow(
        'getAuthClient must be used within a MoleculeProvider with auth configured',
      )
    })

    it('getThemeProvider should throw if not in context', () => {
      expect(() => getThemeProvider()).toThrow(
        'getThemeProvider must be used within a MoleculeProvider with theme configured',
      )
    })

    it('getRouter should throw if not in context', () => {
      expect(() => getRouter()).toThrow(
        'getRouter must be used within a MoleculeProvider with router configured',
      )
    })

    it('getI18nProvider should throw if not in context', () => {
      expect(() => getI18nProvider()).toThrow(
        'getI18nProvider must be used within a MoleculeProvider with i18n configured',
      )
    })

    it('getHttpClient should throw if not in context', () => {
      expect(() => getHttpClient()).toThrow(
        'getHttpClient must be used within a MoleculeProvider with http configured',
      )
    })

    it('getStorageProvider should throw if not in context', () => {
      expect(() => getStorageProvider()).toThrow(
        'getStorageProvider must be used within a MoleculeProvider with storage configured',
      )
    })

    it('getLoggerProvider should throw if not in context', () => {
      expect(() => getLoggerProvider()).toThrow(
        'getLoggerProvider must be used within a MoleculeProvider with logger configured',
      )
    })
  })

  describe('getters return provider when context is populated', () => {
    it('getStateProvider returns state provider from context', () => {
      const mockState = { createStore: vi.fn() } as unknown
      contextValues.set(StateContext.id, mockState)
      expect(getStateProvider()).toBe(mockState)
    })

    it('getAuthClient returns auth client from context', () => {
      const mockAuth = { login: vi.fn() } as unknown
      contextValues.set(AuthContext.id, mockAuth)
      expect(getAuthClient()).toBe(mockAuth)
    })

    it('getThemeProvider returns theme provider from context', () => {
      const mockTheme = { getTheme: vi.fn() } as unknown
      contextValues.set(ThemeContext.id, mockTheme)
      expect(getThemeProvider()).toBe(mockTheme)
    })

    it('getRouter returns router from context', () => {
      const mockRouter = { navigate: vi.fn() } as unknown
      contextValues.set(RouterContext.id, mockRouter)
      expect(getRouter()).toBe(mockRouter)
    })

    it('getI18nProvider returns i18n provider from context', () => {
      const mockI18n = { t: vi.fn() } as unknown
      contextValues.set(I18nContext.id, mockI18n)
      expect(getI18nProvider()).toBe(mockI18n)
    })

    it('getHttpClient returns http client from context', () => {
      const mockHttp = { get: vi.fn() } as unknown
      contextValues.set(HttpContext.id, mockHttp)
      expect(getHttpClient()).toBe(mockHttp)
    })

    it('getStorageProvider returns storage provider from context', () => {
      const mockStorage = { get: vi.fn() } as unknown
      contextValues.set(StorageContext.id, mockStorage)
      expect(getStorageProvider()).toBe(mockStorage)
    })

    it('getLoggerProvider returns logger provider from context', () => {
      const mockLogger = { getLogger: vi.fn() } as unknown
      contextValues.set(LoggerContext.id, mockLogger)
      expect(getLoggerProvider()).toBe(mockLogger)
    })
  })

  describe('exported contexts', () => {
    it('exports all context objects', () => {
      expect(StateContext).toBeDefined()
      expect(AuthContext).toBeDefined()
      expect(ThemeContext).toBeDefined()
      expect(RouterContext).toBeDefined()
      expect(I18nContext).toBeDefined()
      expect(HttpContext).toBeDefined()
      expect(StorageContext).toBeDefined()
      expect(LoggerContext).toBeDefined()
    })

    it('each context has a Provider', () => {
      expect(StateContext.Provider).toBeDefined()
      expect(AuthContext.Provider).toBeDefined()
      expect(ThemeContext.Provider).toBeDefined()
      expect(RouterContext.Provider).toBeDefined()
      expect(I18nContext.Provider).toBeDefined()
      expect(HttpContext.Provider).toBeDefined()
      expect(StorageContext.Provider).toBeDefined()
      expect(LoggerContext.Provider).toBeDefined()
    })
  })
})
