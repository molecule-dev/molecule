/**
 * Tests for useTranslation composable
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockInjectReturnValue: unknown = undefined
const onMountedCallbacks: Array<() => void> = []
const onUnmountedCallbacks: Array<() => void> = []

// Mock Vue
vi.mock('vue', () => ({
  inject: vi.fn(() => mockInjectReturnValue),
  ref: vi.fn((v: unknown) => ({ value: v })),
  computed: vi.fn((fn: () => unknown) => ({ value: fn() })),
  onMounted: vi.fn((cb: () => void) => {
    onMountedCallbacks.push(cb)
  }),
  onUnmounted: vi.fn((cb: () => void) => {
    onUnmountedCallbacks.push(cb)
  }),
}))

// Mock molecule packages
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
  useDirection,
  useI18nProvider,
  useLocale,
  useT,
  useTranslation,
} from '../composables/useTranslation.js'

describe('useI18nProvider', () => {
  beforeEach(() => {
    mockInjectReturnValue = undefined
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
  })

  it('returns the injected i18n provider', () => {
    const mockProvider = { t: vi.fn(), getLocale: vi.fn() }
    mockInjectReturnValue = mockProvider
    const result = useI18nProvider()
    expect(result).toBe(mockProvider)
  })

  it('throws when i18n provider is not injected', () => {
    mockInjectReturnValue = undefined
    expect(() => useI18nProvider()).toThrow('useI18nProvider requires I18nProvider to be provided')
  })
})

describe('useTranslation', () => {
  let mockProvider: {
    t: ReturnType<typeof vi.fn>
    getLocale: ReturnType<typeof vi.fn>
    getDirection: ReturnType<typeof vi.fn>
    getLocales: ReturnType<typeof vi.fn>
    setLocale: ReturnType<typeof vi.fn>
    formatNumber: ReturnType<typeof vi.fn>
    formatDate: ReturnType<typeof vi.fn>
    onLocaleChange: ReturnType<typeof vi.fn>
  }
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockUnsubscribe.mockClear()

    mockProvider = {
      t: vi.fn((key: string, _values?: Record<string, unknown>) => `translated:${key}`),
      getLocale: vi.fn(() => 'en'),
      getDirection: vi.fn(() => 'ltr' as const),
      getLocales: vi.fn(() => [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
      ]),
      setLocale: vi.fn(),
      formatNumber: vi.fn((value: number) => String(value)),
      formatDate: vi.fn((value: Date) => value.toString()),
      onLocaleChange: vi.fn(() => {
        return mockUnsubscribe
      }),
    }
    mockInjectReturnValue = mockProvider
  })

  it('returns t, locale, direction, locales, setLocale, formatNumber, formatDate', () => {
    const result = useTranslation()
    expect(typeof result.t).toBe('function')
    expect(result.locale).toBeDefined()
    expect(result.direction).toBeDefined()
    expect(result.locales).toBeDefined()
    expect(typeof result.setLocale).toBe('function')
    expect(typeof result.formatNumber).toBe('function')
    expect(typeof result.formatDate).toBe('function')
  })

  it('t delegates to provider', () => {
    const result = useTranslation()
    result.t('hello.world', { name: 'Alice' })
    expect(mockProvider.t).toHaveBeenCalledWith('hello.world', { name: 'Alice' })
  })

  it('locale reflects initial locale', () => {
    const result = useTranslation()
    expect(result.locale.value).toBe('en')
  })

  it('direction reflects initial direction', () => {
    const result = useTranslation()
    expect(result.direction.value).toBe('ltr')
  })

  it('locales reflects initial locales', () => {
    const result = useTranslation()
    expect(result.locales.value).toEqual([
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
    ])
  })

  it('setLocale delegates to provider', () => {
    const result = useTranslation()
    result.setLocale('es')
    expect(mockProvider.setLocale).toHaveBeenCalledWith('es')
  })

  it('formatNumber delegates to provider', () => {
    const result = useTranslation()
    result.formatNumber(1234.56, { style: 'currency', currency: 'USD' } as never)
    expect(mockProvider.formatNumber).toHaveBeenCalledWith(1234.56, {
      style: 'currency',
      currency: 'USD',
    })
  })

  it('formatDate delegates to provider', () => {
    const testDate = new Date('2024-01-15')
    const result = useTranslation()
    result.formatDate(testDate)
    expect(mockProvider.formatDate).toHaveBeenCalledWith(testDate, undefined)
  })

  it('subscribes to locale changes on mount', () => {
    useTranslation()
    expect(onMountedCallbacks.length).toBeGreaterThan(0)
    onMountedCallbacks[0]()
    expect(mockProvider.onLocaleChange).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes on unmount', () => {
    useTranslation()
    onMountedCallbacks[0]()
    expect(onUnmountedCallbacks.length).toBeGreaterThan(0)
    onUnmountedCallbacks[0]()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('handles unmount without prior mount', () => {
    useTranslation()
    expect(() => onUnmountedCallbacks[0]()).not.toThrow()
  })
})

describe('useT', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      t: vi.fn((key: string) => `translated:${key}`),
      getLocale: vi.fn(() => 'en'),
      getDirection: vi.fn(() => 'ltr'),
      getLocales: vi.fn(() => []),
      setLocale: vi.fn(),
      formatNumber: vi.fn(),
      formatDate: vi.fn(),
      onLocaleChange: vi.fn(() => vi.fn()),
    }
  })

  it('returns a translation function', () => {
    const t = useT()
    expect(typeof t).toBe('function')
  })

  it('delegates to provider.t', () => {
    const t = useT()
    t('key', { name: 'World' })
    expect((mockInjectReturnValue as never).t).toHaveBeenCalledWith('key', { name: 'World' })
  })
})

describe('useLocale', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      t: vi.fn(),
      getLocale: vi.fn(() => 'fr'),
      getDirection: vi.fn(() => 'ltr'),
      getLocales: vi.fn(() => []),
      setLocale: vi.fn(),
      formatNumber: vi.fn(),
      formatDate: vi.fn(),
      onLocaleChange: vi.fn(() => vi.fn()),
    }
  })

  it('returns the locale computed ref', () => {
    const result = useLocale()
    expect(result.value).toBe('fr')
  })
})

describe('useDirection', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      t: vi.fn(),
      getLocale: vi.fn(() => 'ar'),
      getDirection: vi.fn(() => 'rtl'),
      getLocales: vi.fn(() => []),
      setLocale: vi.fn(),
      formatNumber: vi.fn(),
      formatDate: vi.fn(),
      onLocaleChange: vi.fn(() => vi.fn()),
    }
  })

  it('returns the direction computed ref', () => {
    const result = useDirection()
    expect(result.value).toBe('rtl')
  })
})
