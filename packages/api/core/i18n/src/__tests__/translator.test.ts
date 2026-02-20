import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as TranslatorNs from '../translator.js'

describe('@molecule/api-i18n', () => {
  let t: typeof TranslatorNs.t
  let addTranslations: typeof TranslatorNs.addTranslations
  let getLocale: typeof TranslatorNs.getLocale
  let setLocale: typeof TranslatorNs.setLocale
  let registerLocaleModule: typeof TranslatorNs.registerLocaleModule
  let getProvider: typeof TranslatorNs.getProvider
  let setProvider: typeof TranslatorNs.setProvider

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../translator.js')
    t = mod.t
    addTranslations = mod.addTranslations
    getLocale = mod.getLocale
    setLocale = mod.setLocale
    registerLocaleModule = mod.registerLocaleModule
    getProvider = mod.getProvider
    setProvider = mod.setProvider
  })

  describe('t', () => {
    it('should return the key when no translations are registered', () => {
      expect(t('some.key')).toBe('some.key')
    })

    it('should return defaultValue when key is not found', () => {
      expect(t('missing.key', undefined, { defaultValue: 'Fallback' })).toBe('Fallback')
    })

    it('should translate a registered key', () => {
      addTranslations('en', { hello: 'Hello World' })
      expect(t('hello')).toBe('Hello World')
    })

    it('should interpolate values', () => {
      addTranslations('en', { greeting: 'Hello {{name}}!' })
      expect(t('greeting', { name: 'Alice' })).toBe('Hello Alice!')
    })

    it('should translate in a specific locale via options', () => {
      addTranslations('en', { greeting: 'Hello' })
      addTranslations('es', { greeting: 'Hola' })
      expect(t('greeting')).toBe('Hello')
      expect(t('greeting', undefined, { locale: 'es' })).toBe('Hola')
    })

    it('should fall back to English when requested locale is missing', () => {
      addTranslations('en', { hello: 'Hello' })
      expect(t('hello', undefined, { locale: 'xx' })).toBe('Hello')
    })

    it('should fall back to defaultValue when key is missing in all locales', () => {
      addTranslations('en', { exists: 'Yes' })
      expect(t('missing', undefined, { defaultValue: 'Default', locale: 'fr' })).toBe('Default')
    })

    it('should handle dot-notation keys', () => {
      addTranslations('en', { 'user.error.notFound': 'Not found.' })
      expect(t('user.error.notFound')).toBe('Not found.')
    })

    it('should handle interpolation with numbers', () => {
      addTranslations('en', { count: 'You have {{count}} items' })
      expect(t('count', { count: 42 })).toBe('You have 42 items')
    })

    it('should interpolate variables in defaultValue fallback', () => {
      expect(
        t(
          'missing.key',
          { name: 'Alice', count: 3 },
          {
            defaultValue: 'Hello {{name}}, you have {{count}} items',
          },
        ),
      ).toBe('Hello Alice, you have 3 items')
    })
  })

  describe('addTranslations', () => {
    it('should auto-create locale if it does not exist', () => {
      addTranslations('fr', { hello: 'Bonjour' })
      expect(t('hello', undefined, { locale: 'fr' })).toBe('Bonjour')
    })

    it('should merge translations into existing locale', () => {
      addTranslations('en', { a: 'A' })
      addTranslations('en', { b: 'B' })
      expect(t('a')).toBe('A')
      expect(t('b')).toBe('B')
    })

    it('should support namespace parameter', () => {
      addTranslations('en', { key: 'value' }, 'ns')
      // Namespaced translations are nested
      const provider = getProvider()
      expect(provider.t('ns.key')).toBe('value')
    })
  })

  describe('setLocale / getLocale', () => {
    it('should default to en', () => {
      expect(getLocale()).toBe('en')
    })

    it('should change current locale', () => {
      addTranslations('fr', { hello: 'Bonjour' })
      setLocale('fr')
      expect(getLocale()).toBe('fr')
      expect(t('hello')).toBe('Bonjour')
    })

    it('should throw for unknown locale', () => {
      expect(() => setLocale('xx')).toThrow('Locale "xx" not found')
    })
  })

  describe('registerLocaleModule', () => {
    it('should register all locale objects from a module export', () => {
      const moduleExports = {
        en: { hello: 'Hello' },
        es: { hello: 'Hola' },
        fr: { hello: 'Bonjour' },
      }
      registerLocaleModule(moduleExports)
      expect(t('hello')).toBe('Hello')
      expect(t('hello', undefined, { locale: 'es' })).toBe('Hola')
      expect(t('hello', undefined, { locale: 'fr' })).toBe('Bonjour')
    })

    it('should map zhTW to zh-TW', () => {
      const moduleExports = {
        en: { hello: 'Hello' },
        zhTW: { hello: '你好' },
      }
      registerLocaleModule(moduleExports)
      expect(t('hello', undefined, { locale: 'zh-TW' })).toBe('你好')
    })

    it('should skip non-translation exports (types, functions)', () => {
      const moduleExports = {
        en: { hello: 'Hello' },
        SomeType: undefined,
        someFunction: () => {},
        emptyObj: {},
      }
      // Should not throw
      registerLocaleModule(moduleExports as Record<string, unknown>)
      expect(t('hello')).toBe('Hello')
    })
  })

  describe('setProvider / getProvider', () => {
    it('should auto-create default provider on first use', () => {
      const provider = getProvider()
      expect(provider).toBeDefined()
      expect(provider.getLocale()).toBe('en')
    })

    it('should allow swapping providers', async () => {
      const { createSimpleI18nProvider } = await import('../provider.js')
      const custom = createSimpleI18nProvider('de')
      custom.addTranslations('de', { hello: 'Hallo' })
      setProvider(custom)
      expect(getLocale()).toBe('de')
      expect(t('hello')).toBe('Hallo')
    })
  })

  describe('type exports', () => {
    it('should export all expected types and functions', async () => {
      const mod = await import('../index.js')
      expect(mod.t).toBeTypeOf('function')
      expect(mod.addTranslations).toBeTypeOf('function')
      expect(mod.addLocale).toBeTypeOf('function')
      expect(mod.setLocale).toBeTypeOf('function')
      expect(mod.getLocale).toBeTypeOf('function')
      expect(mod.setProvider).toBeTypeOf('function')
      expect(mod.getProvider).toBeTypeOf('function')
      expect(mod.registerLocaleModule).toBeTypeOf('function')
      expect(mod.createSimpleI18nProvider).toBeTypeOf('function')
      expect(mod.simpleProvider).toBeDefined()
      expect(mod.getNestedValue).toBeTypeOf('function')
      expect(mod.interpolate).toBeTypeOf('function')
      expect(mod.getPluralForm).toBeTypeOf('function')
      expect(mod.formatNumber).toBeTypeOf('function')
      expect(mod.formatDate).toBeTypeOf('function')
      expect(mod.formatRelativeTime).toBeTypeOf('function')
    })
  })
})
