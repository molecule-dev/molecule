import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
  Inject: () => () => undefined,
  InjectionToken: class InjectionToken {
    _desc: string
    constructor(desc: string) {
      this._desc = desc
    }
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

import { MoleculeI18nService } from '../services/i18n.service.js'

describe('MoleculeI18nService', () => {
  let service: MoleculeI18nService
  let mockProvider: Record<string, ReturnType<typeof vi.fn>>
  let localeChangeCallback: (() => void) | null

  beforeEach(() => {
    localeChangeCallback = null

    mockProvider = {
      getLocale: vi.fn(() => 'en'),
      getDirection: vi.fn(() => 'ltr' as const),
      getLocales: vi.fn(() => [
        { code: 'en', name: 'English' },
        { code: 'ar', name: 'Arabic' },
      ]),
      onLocaleChange: vi.fn((cb: () => void) => {
        localeChangeCallback = cb
        return () => {
          localeChangeCallback = null
        }
      }),
      t: vi.fn((key: string, _values?: Record<string, unknown>) => `translated:${key}`),
      setLocale: vi.fn(),
      formatNumber: vi.fn((value: number) => `${value}`),
      formatDate: vi.fn((_value: unknown) => 'formatted-date'),
    }

    service = new MoleculeI18nService(mockProvider)
  })

  describe('constructor', () => {
    it('should initialize locale$ with the current locale', async () => {
      const locale = await firstValueFrom(service.locale$)
      expect(locale).toBe('en')
    })

    it('should initialize direction$ with the current direction', async () => {
      const direction = await firstValueFrom(service.direction$)
      expect(direction).toBe('ltr')
    })

    it('should initialize locales$ with the available locales', async () => {
      const locales = await firstValueFrom(service.locales$)
      expect(locales).toEqual([
        { code: 'en', name: 'English' },
        { code: 'ar', name: 'Arabic' },
      ])
    })

    it('should subscribe to locale changes', () => {
      expect(mockProvider.onLocaleChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('reactive state updates', () => {
    it('should update locale$ when locale changes', () => {
      const locales: string[] = []
      service.locale$.subscribe((l) => locales.push(l))

      mockProvider.getLocale.mockReturnValue('ar')
      mockProvider.getDirection.mockReturnValue('rtl')
      mockProvider.getLocales.mockReturnValue([
        { code: 'en', name: 'English' },
        { code: 'ar', name: 'Arabic' },
      ])
      localeChangeCallback!()

      expect(locales).toHaveLength(2)
      expect(locales[1]).toBe('ar')
    })

    it('should update direction$ when locale changes', () => {
      const directions: string[] = []
      service.direction$.subscribe((d) => directions.push(d))

      mockProvider.getLocale.mockReturnValue('ar')
      mockProvider.getDirection.mockReturnValue('rtl')
      mockProvider.getLocales.mockReturnValue([])
      localeChangeCallback!()

      expect(directions).toHaveLength(2)
      expect(directions[1]).toBe('rtl')
    })

    it('should update locales$ when locale changes', () => {
      const allLocales: unknown[] = []
      service.locales$.subscribe((l) => allLocales.push(l))

      mockProvider.getLocale.mockReturnValue('fr')
      mockProvider.getDirection.mockReturnValue('ltr')
      mockProvider.getLocales.mockReturnValue([
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'French' },
        { code: 'ar', name: 'Arabic' },
      ])
      localeChangeCallback!()

      expect(allLocales).toHaveLength(2)
      expect(allLocales[1]).toHaveLength(3)
    })
  })

  describe('synchronous getters', () => {
    it('should return current locale snapshot', () => {
      expect(service.locale).toBe('en')
      expect(mockProvider.getLocale).toHaveBeenCalled()
    })

    it('should return current direction snapshot', () => {
      expect(service.direction).toBe('ltr')
      expect(mockProvider.getDirection).toHaveBeenCalled()
    })
  })

  describe('t', () => {
    it('should delegate translation to the provider', () => {
      const result = service.t('hello.world')
      expect(mockProvider.t).toHaveBeenCalledWith('hello.world', undefined)
      expect(result).toBe('translated:hello.world')
    })

    it('should pass interpolation values to the provider', () => {
      service.t('welcome', { name: 'Test' })
      expect(mockProvider.t).toHaveBeenCalledWith('welcome', { name: 'Test' })
    })
  })

  describe('setLocale', () => {
    it('should delegate setLocale to the provider', () => {
      service.setLocale('fr')
      expect(mockProvider.setLocale).toHaveBeenCalledWith('fr')
    })
  })

  describe('formatNumber', () => {
    it('should delegate formatNumber to the provider', () => {
      const result = service.formatNumber(12345)
      expect(mockProvider.formatNumber).toHaveBeenCalledWith(12345, undefined)
      expect(result).toBe('12345')
    })

    it('should pass format options to the provider', () => {
      const options = { style: 'currency', currency: 'USD' } as Intl.NumberFormatOptions
      service.formatNumber(99.99, options)
      expect(mockProvider.formatNumber).toHaveBeenCalledWith(99.99, options)
    })
  })

  describe('formatDate', () => {
    it('should delegate formatDate to the provider', () => {
      const date = new Date('2024-01-01')
      const result = service.formatDate(date)
      expect(mockProvider.formatDate).toHaveBeenCalledWith(date, undefined)
      expect(result).toBe('formatted-date')
    })

    it('should pass format options to the provider', () => {
      const options = { dateStyle: 'long' } as Intl.DateTimeFormatOptions
      service.formatDate('2024-01-01', options)
      expect(mockProvider.formatDate).toHaveBeenCalledWith('2024-01-01', options)
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe from locale changes', () => {
      expect(localeChangeCallback).not.toBeNull()
      service.ngOnDestroy()
      expect(localeChangeCallback).toBeNull()
    })

    it('should complete all subjects', () => {
      const completeSpy1 = vi.fn()
      const completeSpy2 = vi.fn()
      const completeSpy3 = vi.fn()
      service.locale$.subscribe({ complete: completeSpy1 })
      service.direction$.subscribe({ complete: completeSpy2 })
      service.locales$.subscribe({ complete: completeSpy3 })

      service.ngOnDestroy()

      expect(completeSpy1).toHaveBeenCalledTimes(1)
      expect(completeSpy2).toHaveBeenCalledTimes(1)
      expect(completeSpy3).toHaveBeenCalledTimes(1)
    })

    it('should handle being called multiple times', () => {
      service.ngOnDestroy()
      expect(() => service.ngOnDestroy()).not.toThrow()
    })
  })
})
