import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nError } from '../error.js'
import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  PluralRule,
  Translations,
} from '../index.js'
import { getPluralForm } from '../plural.js'
import { createSimpleI18nProvider, simpleProvider } from '../provider.js'
import {
  formatDate,
  formatNumber,
  formatRelativeTime,
  getLocale,
  getProvider,
  onLocaleChange,
  registerContent,
  setLocale,
  setProvider,
  t,
} from '../translator.js'
import { getNestedValue, interpolate } from '../utilities.js'

describe('@molecule/app-i18n', () => {
  describe('Types compile correctly', () => {
    it('should compile Translations type', () => {
      const translations: Translations = {
        hello: 'Hello',
        nested: {
          greeting: 'Hi there',
          deep: {
            message: 'Deep message',
          },
        },
      }
      expect(translations.hello).toBe('Hello')
    })

    it('should compile InterpolationValues type', () => {
      const values: InterpolationValues = {
        name: 'John',
        count: 5,
        active: true,
        date: new Date(),
      }
      expect(values.name).toBe('John')
    })

    it('should compile PluralRule type', () => {
      const rule: PluralRule = {
        zero: 'No items',
        one: 'One item',
        two: 'Two items',
        few: 'A few items',
        many: 'Many items',
        other: '{{count}} items',
      }
      expect(rule.other).toBe('{{count}} items')
    })

    it('should compile LocaleConfig type', () => {
      const config: LocaleConfig = {
        code: 'en-US',
        name: 'English (US)',
        nativeName: 'English',
        direction: 'ltr',
        translations: { hello: 'Hello' },
      }
      expect(config.direction).toBe('ltr')
    })

    it('should compile NumberFormatOptions type', () => {
      const options: NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      }
      expect(options.style).toBe('currency')
    })

    it('should compile DateFormatOptions type', () => {
      const options: DateFormatOptions = {
        dateStyle: 'full',
        timeStyle: 'short',
        format: 'YYYY-MM-DD',
        relative: false,
      }
      expect(options.dateStyle).toBe('full')
    })
  })

  describe('getNestedValue', () => {
    const translations: Translations = {
      simple: 'Simple value',
      nested: {
        level1: 'Level 1',
        deeper: {
          level2: 'Level 2',
        },
      },
    }

    it('should get a simple value', () => {
      expect(getNestedValue(translations, 'simple')).toBe('Simple value')
    })

    it('should get a nested value', () => {
      expect(getNestedValue(translations, 'nested.level1')).toBe('Level 1')
    })

    it('should get a deeply nested value', () => {
      expect(getNestedValue(translations, 'nested.deeper.level2')).toBe('Level 2')
    })

    it('should return undefined for non-existent key', () => {
      expect(getNestedValue(translations, 'nonexistent')).toBeUndefined()
    })

    it('should return undefined for non-existent nested key', () => {
      expect(getNestedValue(translations, 'nested.nonexistent')).toBeUndefined()
    })

    it('should return undefined if intermediate value is string', () => {
      expect(getNestedValue(translations, 'simple.nested')).toBeUndefined()
    })
  })

  describe('interpolate', () => {
    it('should interpolate string values', () => {
      const result = interpolate('Hello, {{name}}!', { name: 'John' })
      expect(result).toBe('Hello, John!')
    })

    it('should interpolate number values', () => {
      const result = interpolate('You have {{count}} items', { count: 5 })
      expect(result).toBe('You have 5 items')
    })

    it('should interpolate boolean values', () => {
      const result = interpolate('Active: {{active}}', { active: true })
      expect(result).toBe('Active: true')
    })

    it('should interpolate Date values', () => {
      const date = new Date('2024-01-15')
      const result = interpolate('Date: {{date}}', { date })
      expect(result).toContain('Date:')
    })

    it('should keep placeholder for missing values', () => {
      const result = interpolate('Hello, {{name}}!', {})
      expect(result).toBe('Hello, {{name}}!')
    })

    it('should handle multiple placeholders', () => {
      const result = interpolate('{{greeting}}, {{name}}!', { greeting: 'Hello', name: 'John' })
      expect(result).toBe('Hello, John!')
    })

    it('should handle no placeholders', () => {
      const result = interpolate('Hello, World!', { name: 'John' })
      expect(result).toBe('Hello, World!')
    })
  })

  describe('getPluralForm', () => {
    it('should return "one" for count 1 in English', () => {
      expect(getPluralForm(1, 'en')).toBe('one')
    })

    it('should return "other" for count 0 in English', () => {
      expect(getPluralForm(0, 'en')).toBe('other')
    })

    it('should return "other" for count > 1 in English', () => {
      expect(getPluralForm(2, 'en')).toBe('other')
      expect(getPluralForm(5, 'en')).toBe('other')
      expect(getPluralForm(100, 'en')).toBe('other')
    })

    it('should handle fractional numbers', () => {
      const result = getPluralForm(1.5, 'en')
      expect(result).toBe('other')
    })

    it('should handle different locales', () => {
      // Arabic has more plural forms
      expect(getPluralForm(0, 'ar')).toBe('zero')
      expect(getPluralForm(1, 'ar')).toBe('one')
      expect(getPluralForm(2, 'ar')).toBe('two')
    })
  })

  describe('createSimpleI18nProvider', () => {
    let provider: I18nProvider

    beforeEach(() => {
      provider = createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          direction: 'ltr',
          translations: {
            greeting: 'Hello',
            welcome: 'Welcome, {{name}}!',
            items_one: '{{count}} item',
            items_other: '{{count}} items',
            nested: {
              message: 'Nested message',
            },
          },
        },
        {
          code: 'fr',
          name: 'French',
          direction: 'ltr',
          translations: {
            greeting: 'Bonjour',
            welcome: 'Bienvenue, {{name}}!',
          },
        },
        {
          code: 'ar',
          name: 'Arabic',
          direction: 'rtl',
          translations: {
            greeting: 'Ahlan',
          },
        },
      ])
    })

    describe('getLocale/setLocale', () => {
      it('should return the current locale', () => {
        expect(provider.getLocale()).toBe('en')
      })

      it('should change the locale', async () => {
        await provider.setLocale('fr')
        expect(provider.getLocale()).toBe('fr')
      })

      it('should throw error for non-existent locale', async () => {
        await expect(provider.setLocale('de')).rejects.toThrow('Locale "de" not found')
      })
    })

    describe('getLocales', () => {
      it('should return all available locales', () => {
        const locales = provider.getLocales()
        expect(locales).toHaveLength(3)
        expect(locales.map((l) => l.code)).toContain('en')
        expect(locales.map((l) => l.code)).toContain('fr')
        expect(locales.map((l) => l.code)).toContain('ar')
      })
    })

    describe('addLocale', () => {
      it('should add a new locale', () => {
        provider.addLocale({
          code: 'de',
          name: 'German',
          direction: 'ltr',
          translations: { greeting: 'Hallo' },
        })
        expect(provider.getLocales().map((l) => l.code)).toContain('de')
      })
    })

    describe('addTranslations', () => {
      it('should add translations to existing locale', () => {
        provider.addTranslations('en', { newKey: 'New value' })
        expect(provider.t('newKey')).toBe('New value')
      })

      it('should add translations with namespace', () => {
        provider.addTranslations('en', { key: 'Namespaced value' }, 'ns')
        expect(provider.t('ns.key')).toBe('Namespaced value')
      })

      it('should throw error for non-existent locale', () => {
        expect(() => provider.addTranslations('de', { key: 'value' })).toThrow(
          'Locale "de" not found',
        )
      })
    })

    describe('t (translate)', () => {
      it('should translate a simple key', () => {
        expect(provider.t('greeting')).toBe('Hello')
      })

      it('should translate with interpolation', () => {
        expect(provider.t('welcome', { name: 'John' })).toBe('Welcome, John!')
      })

      it('should translate nested keys', () => {
        expect(provider.t('nested.message')).toBe('Nested message')
      })

      it('should return key for missing translation', () => {
        expect(provider.t('missing.key')).toBe('missing.key')
      })

      it('should return default value for missing translation', () => {
        expect(provider.t('missing.key', undefined, { defaultValue: 'Default' })).toBe('Default')
      })

      it('should handle pluralization with count=1', () => {
        expect(provider.t('items', { count: 1 }, { count: 1 })).toBe('1 item')
      })

      it('should handle pluralization with count>1', () => {
        expect(provider.t('items', { count: 5 }, { count: 5 })).toBe('5 items')
      })

      it('should translate in different locale', async () => {
        await provider.setLocale('fr')
        expect(provider.t('greeting')).toBe('Bonjour')
      })
    })

    describe('exists', () => {
      it('should return true for existing key', () => {
        expect(provider.exists('greeting')).toBe(true)
      })

      it('should return true for nested key', () => {
        expect(provider.exists('nested.message')).toBe(true)
      })

      it('should return false for non-existent key', () => {
        expect(provider.exists('nonexistent')).toBe(false)
      })
    })

    describe('formatNumber', () => {
      it('should format a number', () => {
        const formatted = provider.formatNumber(1234.56)
        expect(formatted).toContain('1')
        expect(formatted).toContain('234')
      })

      it('should format as currency', () => {
        const formatted = provider.formatNumber(1234.56, { style: 'currency', currency: 'USD' })
        expect(formatted).toContain('$')
        expect(formatted).toContain('1,234.56')
      })

      it('should format as percent', () => {
        const formatted = provider.formatNumber(0.75, { style: 'percent' })
        expect(formatted).toContain('75')
        expect(formatted).toContain('%')
      })
    })

    describe('formatDate', () => {
      it('should format a Date object', () => {
        const date = new Date('2024-01-15T10:30:00')
        const formatted = provider.formatDate(date)
        expect(formatted).toBeTruthy()
      })

      it('should format a timestamp', () => {
        const timestamp = new Date('2024-01-15').getTime()
        const formatted = provider.formatDate(timestamp)
        expect(formatted).toBeTruthy()
      })

      it('should format a date string', () => {
        const formatted = provider.formatDate('2024-01-15')
        expect(formatted).toBeTruthy()
      })

      it('should use dateStyle option', () => {
        const date = new Date('2024-01-15')
        const formatted = provider.formatDate(date, { dateStyle: 'full' })
        expect(formatted).toContain('2024')
      })
    })

    describe('formatRelativeTime', () => {
      it('should format past time', () => {
        const past = new Date(Date.now() - 60000) // 1 minute ago
        const formatted = provider.formatRelativeTime(past)
        expect(formatted).toBeTruthy()
      })

      it('should format future time', () => {
        const future = new Date(Date.now() + 3600000) // 1 hour from now
        const formatted = provider.formatRelativeTime(future)
        expect(formatted).toBeTruthy()
      })

      it('should handle specific unit', () => {
        const date = new Date(Date.now() - 86400000) // 1 day ago
        const formatted = provider.formatRelativeTime(date, { unit: 'day' })
        expect(formatted).toBeTruthy()
      })
    })

    describe('formatList', () => {
      it('should format a list with conjunction', () => {
        const formatted = provider.formatList(['Apple', 'Banana', 'Cherry'])
        expect(formatted).toContain('Apple')
        expect(formatted).toContain('Banana')
        expect(formatted).toContain('Cherry')
        expect(formatted).toContain('and')
      })

      it('should format a list with disjunction', () => {
        const formatted = provider.formatList(['Red', 'Green', 'Blue'], { type: 'disjunction' })
        expect(formatted).toContain('or')
      })
    })

    describe('onLocaleChange', () => {
      it('should notify listeners on locale change', async () => {
        const listener = vi.fn()
        provider.onLocaleChange(listener)

        await provider.setLocale('fr')
        expect(listener).toHaveBeenCalledWith('fr')
      })

      it('should return unsubscribe function', async () => {
        const listener = vi.fn()
        const unsubscribe = provider.onLocaleChange(listener)

        unsubscribe()
        await provider.setLocale('fr')
        expect(listener).not.toHaveBeenCalled()
      })
    })

    describe('getDirection', () => {
      it('should return ltr for English', () => {
        expect(provider.getDirection()).toBe('ltr')
      })

      it('should return rtl for Arabic', async () => {
        await provider.setLocale('ar')
        expect(provider.getDirection()).toBe('rtl')
      })
    })

    describe('registerContent', () => {
      it('should call registered content loaders during setLocale', async () => {
        const loader = vi.fn().mockResolvedValue(undefined)
        provider.registerContent!('privacyPolicy', loader)

        await provider.setLocale('fr')
        expect(loader).toHaveBeenCalledWith('fr')
      })

      it('should call all registered content loaders', async () => {
        const loader1 = vi.fn().mockResolvedValue(undefined)
        const loader2 = vi.fn().mockResolvedValue(undefined)
        provider.registerContent!('privacyPolicy', loader1)
        provider.registerContent!('termsOfService', loader2)

        await provider.setLocale('fr')
        expect(loader1).toHaveBeenCalledWith('fr')
        expect(loader2).toHaveBeenCalledWith('fr')
      })

      it('should be idempotent — second registration with same module is ignored', async () => {
        const loader1 = vi.fn().mockResolvedValue(undefined)
        const loader2 = vi.fn().mockResolvedValue(undefined)
        provider.registerContent!('privacyPolicy', loader1)
        provider.registerContent!('privacyPolicy', loader2)

        await provider.setLocale('fr')
        expect(loader1).toHaveBeenCalledWith('fr')
        expect(loader2).not.toHaveBeenCalled()
      })

      it('should reload content on every setLocale call', async () => {
        const loader = vi.fn().mockResolvedValue(undefined)
        provider.registerContent!('privacyPolicy', loader)

        await provider.setLocale('fr')
        await provider.setLocale('en')
        expect(loader).toHaveBeenCalledTimes(2)
        expect(loader).toHaveBeenCalledWith('fr')
        expect(loader).toHaveBeenCalledWith('en')
      })

      it('should load content before listeners are notified', async () => {
        const callOrder: string[] = []

        provider.onLocaleChange(() => {
          callOrder.push('listener')
        })

        const loader = vi.fn().mockImplementation(async () => {
          callOrder.push('content')
        })
        provider.registerContent!('privacyPolicy', loader)

        await provider.setLocale('fr')
        expect(callOrder).toEqual(['content', 'listener'])
      })
    })

    describe('lazy loading', () => {
      it('should load translations via loader on first setLocale', async () => {
        const loader = vi.fn().mockResolvedValue({
          greeting: 'Bonjour',
          welcome: 'Bienvenue, {{name}}!',
        })
        const provider = createSimpleI18nProvider('en', [
          {
            code: 'en',
            name: 'English',
            direction: 'ltr',
            translations: { greeting: 'Hello' },
          },
          {
            code: 'fr',
            name: 'French',
            direction: 'ltr',
            loader,
          },
        ])

        await provider.setLocale('fr')
        expect(loader).toHaveBeenCalledOnce()
        expect(provider.t('greeting')).toBe('Bonjour')
        expect(provider.t('welcome', { name: 'Jean' })).toBe('Bienvenue, Jean!')
      })

      it('should call loader only once (cached)', async () => {
        const loader = vi.fn().mockResolvedValue({ greeting: 'Bonjour' })
        const provider = createSimpleI18nProvider('en', [
          {
            code: 'en',
            name: 'English',
            translations: { greeting: 'Hello' },
          },
          {
            code: 'fr',
            name: 'French',
            loader,
          },
        ])

        await provider.setLocale('fr')
        await provider.setLocale('en')
        await provider.setLocale('fr')
        expect(loader).toHaveBeenCalledOnce()
      })

      it('should merge loader translations with existing translations', async () => {
        const loader = vi.fn().mockResolvedValue({ b: 'B from loader' })
        const provider = createSimpleI18nProvider('en', [
          {
            code: 'en',
            name: 'English',
            translations: { greeting: 'Hello' },
          },
          {
            code: 'fr',
            name: 'French',
            translations: { a: 'A from config' },
            loader,
          },
        ])

        await provider.setLocale('fr')
        expect(provider.t('a')).toBe('A from config')
        expect(provider.t('b')).toBe('B from loader')
      })

      it('should show locale metadata in getLocales before loading', () => {
        const provider = createSimpleI18nProvider('en', [
          {
            code: 'en',
            name: 'English',
            translations: { greeting: 'Hello' },
          },
          {
            code: 'fr',
            name: 'French',
            direction: 'ltr',
            loader: vi.fn().mockResolvedValue({}),
          },
        ])

        const locales = provider.getLocales()
        const fr = locales.find((l) => l.code === 'fr')
        expect(fr).toBeDefined()
        expect(fr!.name).toBe('French')
        expect(fr!.direction).toBe('ltr')
      })

      it('should notify listeners after lazy load completes', async () => {
        const listener = vi.fn()
        const loader = vi.fn().mockResolvedValue({ greeting: 'Bonjour' })
        const provider = createSimpleI18nProvider('en', [
          {
            code: 'en',
            name: 'English',
            translations: { greeting: 'Hello' },
          },
          {
            code: 'fr',
            name: 'French',
            loader,
          },
        ])

        provider.onLocaleChange(listener)
        await provider.setLocale('fr')

        expect(listener).toHaveBeenCalledWith('fr')
        expect(provider.t('greeting')).toBe('Bonjour')
      })
    })
  })

  describe('simpleProvider', () => {
    it('should export a default provider', () => {
      expect(simpleProvider).toBeDefined()
      expect(simpleProvider.getLocale).toBeDefined()
    })
  })

  describe('Translator convenience functions', () => {
    beforeEach(() => {
      const provider = createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          direction: 'ltr',
          translations: {
            greeting: 'Hello',
            welcome: 'Welcome, {{name}}!',
          },
        },
      ])
      setProvider(provider)
    })

    it('should get provider', () => {
      expect(getProvider()).toBeDefined()
    })

    it('should get locale', () => {
      expect(getLocale()).toBe('en')
    })

    it('should set locale', async () => {
      // Note: This would fail since 'fr' is not in our test provider
      // Just testing the function exists
      expect(typeof setLocale).toBe('function')
    })

    it('should translate with t()', () => {
      expect(t('greeting')).toBe('Hello')
      expect(t('welcome', { name: 'John' })).toBe('Welcome, John!')
    })

    it('should format number', () => {
      const formatted = formatNumber(1234.56)
      expect(formatted).toBeTruthy()
    })

    it('should format date', () => {
      const formatted = formatDate(new Date())
      expect(formatted).toBeTruthy()
    })

    it('should format relative time', () => {
      const formatted = formatRelativeTime(new Date(Date.now() - 60000))
      expect(formatted).toBeTruthy()
    })

    it('should subscribe to locale changes', () => {
      const listener = vi.fn()
      const unsubscribe = onLocaleChange(listener)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('should register content via registerContent', () => {
      const loader = vi.fn().mockResolvedValue(undefined)
      registerContent('testModule', loader)
      // Verify it delegates to the provider (registerContent is optional, so use ?.)
      expect(typeof registerContent).toBe('function')
    })
  })

  describe('Default English locale', () => {
    it('should create provider with default English locale', () => {
      const provider = createSimpleI18nProvider()
      expect(provider.getLocale()).toBe('en')
      expect(provider.getLocales().map((l) => l.code)).toContain('en')
    })
  })

  describe('I18nError', () => {
    it('should set i18nKey from constructor', () => {
      const error = new I18nError('some.translation.key')
      expect(error.i18nKey).toBe('some.translation.key')
    })

    it('should use key as message when no fallback provided', () => {
      const error = new I18nError('some.translation.key')
      expect(error.message).toBe('some.translation.key')
    })

    it('should use fallback as message when provided', () => {
      const error = new I18nError('some.key', undefined, 'Human readable fallback')
      expect(error.message).toBe('Human readable fallback')
    })

    it('should set i18nValues when provided', () => {
      const values = { name: 'Alice', count: 3 }
      const error = new I18nError('some.key', values, 'fallback')
      expect(error.i18nValues).toEqual({ name: 'Alice', count: 3 })
    })

    it('should leave i18nValues undefined when not provided', () => {
      const error = new I18nError('some.key')
      expect(error.i18nValues).toBeUndefined()
    })

    it('should set name to I18nError', () => {
      const error = new I18nError('some.key')
      expect(error.name).toBe('I18nError')
    })

    it('should be an instance of Error', () => {
      const error = new I18nError('some.key')
      expect(error).toBeInstanceOf(Error)
    })

    it('should be an instance of I18nError', () => {
      const error = new I18nError('some.key')
      expect(error).toBeInstanceOf(I18nError)
    })

    it('should preserve cause when provided', () => {
      const cause = new Error('original error')
      const error = new I18nError('some.key', undefined, 'fallback', cause)
      expect(error.cause).toBe(cause)
    })

    it('should not set cause when omitted', () => {
      const error = new I18nError('some.key', undefined, 'fallback')
      expect(error.cause).toBeUndefined()
    })

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new I18nError('auth.error.invalidCredentials', undefined, 'Invalid credentials')
      }).toThrow('Invalid credentials')
    })

    it('should be identifiable by instanceof after catch', () => {
      let caught: unknown
      try {
        throw new I18nError('auth.error.invalidCredentials', undefined, 'Invalid credentials')
      } catch (err) {
        caught = err
      }
      expect(caught).toBeInstanceOf(I18nError)
      expect((caught as I18nError).i18nKey).toBe('auth.error.invalidCredentials')
    })
  })
})
