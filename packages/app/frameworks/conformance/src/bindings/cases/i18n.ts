/**
 * Cases for the i18n hooks.
 *
 * `t` text is compared through `call` outcomes (a function result itself
 * snapshots as `'[function]'`), one call after each locale change.
 *
 * @module
 */

import { I18nError } from '@molecule/app-i18n'

import type { HookCases } from '../spec.js'

/** `useTranslation()`: `t`, the locale, and the formatters. */
export const useTranslationCases: HookCases = {
  hook: 'useTranslation',
  cases: [
    { name: 'english by default' },
    {
      name: 't returns the default value for a missing key',
      steps: [
        {
          type: 'call',
          method: 't',
          args: ['greeting.hello', undefined, { defaultValue: 'Hello' }],
        },
      ],
    },
    {
      name: 't interpolates values into the default value',
      steps: [
        {
          type: 'call',
          method: 't',
          args: ['greeting.name', { name: 'Ada' }, { defaultValue: 'Hi {{name}}' }],
        },
      ],
    },
    {
      name: 't returns the key without a default value',
      steps: [{ type: 'call', method: 't', args: ['greeting.hello'] }],
    },
    {
      name: 'follows a locale change',
      steps: [{ type: 'locale', locale: 'fr' }],
    },
    {
      name: 't reads the active locale translation',
      context: {
        translations: { en: { 'greeting.hello': 'Hello' }, fr: { 'greeting.hello': 'Bonjour' } },
      },
      steps: [
        { type: 'call', method: 't', args: ['greeting.hello'] },
        { type: 'locale', locale: 'fr' },
        { type: 'call', method: 't', args: ['greeting.hello'] },
      ],
    },
    {
      name: 'setLocale switches to a right-to-left locale',
      steps: [{ type: 'call', method: 'setLocale', args: ['ar'] }],
    },
    {
      name: 't resolves a dot key into nested translations',
      context: {
        translations: {
          en: { app: { greet: { hello: 'Hello there' } } },
        },
      },
      steps: [{ type: 'call', method: 't', args: ['app.greet.hello'] }],
    },
    {
      name: 't falls back to English when the active locale lacks the key',
      context: {
        translations: { en: { 'common.save': 'Save' }, fr: { 'common.other': 'Autre' } },
      },
      steps: [
        { type: 'call', method: 't', args: ['common.save'] },
        { type: 'locale', locale: 'fr' },
        { type: 'call', method: 't', args: ['common.save'] },
      ],
    },
    {
      name: 'a key only present in another locale does not leak into english',
      context: { translations: { fr: { 'only.french': 'Uniquement français' } } },
      steps: [
        { type: 'call', method: 't', args: ['only.french'] },
        { type: 'locale', locale: 'fr' },
        { type: 'call', method: 't', args: ['only.french'] },
      ],
    },
    {
      name: 't picks the plural form for the count',
      context: {
        translations: {
          en: { 'cart.items_one': '{{count}} item', 'cart.items_other': '{{count}} items' },
        },
      },
      steps: [
        { type: 'call', method: 't', args: ['cart.items', undefined, { count: 1 }] },
        { type: 'call', method: 't', args: ['cart.items', undefined, { count: 3 }] },
      ],
    },
    {
      name: 'a plural suffixed key wins over the base key',
      context: {
        translations: {
          en: {
            'cart.things': 'Things',
            'cart.things_one': 'One thing',
            'cart.things_other': '{{count}} things',
          },
        },
      },
      steps: [{ type: 'call', method: 't', args: ['cart.things', undefined, { count: 1 }] }],
    },
    {
      name: 'a count without plural keys falls back to the base key',
      context: { translations: { en: { 'cart.total': '{{count}} total' } } },
      steps: [{ type: 'call', method: 't', args: ['cart.total', undefined, { count: 2 }] }],
    },
    {
      name: 'count reaches the default value interpolation',
      steps: [
        {
          type: 'call',
          method: 't',
          args: ['cart.missing', undefined, { count: 5, defaultValue: '{{count}} in cart' }],
        },
      ],
    },
    {
      name: 'arabic plural categories resolve per count',
      context: {
        translations: {
          ar: {
            apples_zero: 'لا تفاح',
            apples_one: 'تفاحة واحدة',
            apples_two: 'تفاحتان',
            apples_few: '{{count}} تفاحات',
            apples_many: '{{count}} تفاحة',
            apples_other: '{{count}} تفاحة',
          },
        },
      },
      steps: [
        { type: 'locale', locale: 'ar' },
        { type: 'call', method: 't', args: ['apples', undefined, { count: 0 }] },
        { type: 'call', method: 't', args: ['apples', undefined, { count: 2 }] },
        { type: 'call', method: 't', args: ['apples', undefined, { count: 3 }] },
        { type: 'call', method: 't', args: ['apples', undefined, { count: 11 }] },
      ],
    },
    {
      name: 'an empty key without a default value returns an empty string',
      steps: [{ type: 'call', method: 't', args: [''] }],
    },
    {
      name: 'interpolation leaves unfilled placeholders as written',
      steps: [
        {
          type: 'call',
          method: 't',
          args: ['greeting.name', undefined, { defaultValue: 'Hi {{name}}' }],
        },
        {
          type: 'call',
          method: 't',
          args: ['move.column', { column: 'done' }, { defaultValue: 'Move to {column} ({note})' }],
        },
      ],
    },
    {
      name: 't stringifies numbers and booleans in placeholders',
      steps: [
        {
          type: 'call',
          method: 't',
          args: ['mix.values', { n: 3, ok: true }, { defaultValue: '{{n}} / {{ok}}' }],
        },
      ],
    },
    {
      name: 'an empty defaultValue falls back to the key',
      steps: [
        { type: 'call', method: 't', args: ['missing.key', undefined, { defaultValue: '' }] },
      ],
    },
    {
      name: 'setLocale rejects an unknown locale and keeps the current one',
      steps: [{ type: 'call', method: 'setLocale', args: ['xx'] }],
    },
    {
      name: 'formatNumber formats for the active locale',
      steps: [
        { type: 'call', method: 'formatNumber', args: [1234.56] },
        {
          type: 'call',
          method: 'formatNumber',
          args: [9.99, { style: 'currency', currency: 'USD' }],
        },
        { type: 'locale', locale: 'de' },
        { type: 'call', method: 'formatNumber', args: [1234.56] },
        {
          type: 'call',
          method: 'formatNumber',
          args: [9.99, { style: 'currency', currency: 'USD' }],
        },
      ],
    },
    {
      name: 'formatDate formats a date for the active locale',
      // Noon UTC stays on the same calendar day in every timezone within
      // UTC-11..UTC+11, so the golden does not depend on the runner's zone.
      steps: [
        {
          type: 'call',
          method: 'formatDate',
          args: [new Date('2026-01-15T12:00:00Z'), { dateStyle: 'long' }],
        },
        { type: 'locale', locale: 'fr' },
        {
          type: 'call',
          method: 'formatDate',
          args: [new Date('2026-01-15T12:00:00Z'), { dateStyle: 'long' }],
        },
      ],
    },
    {
      name: 'unmount removes the locale listener',
      steps: [
        { type: 'locale', locale: 'fr' },
        { type: 'unmount' },
        { type: 'locale', locale: 'de' },
      ],
    },
    {
      // setLocale and the formatters keep one identity per provider. `t` is left
      // out: React gives it a new identity per locale so a value memoized on [t]
      // refreshes, and `useT` is the hook with one identity across locales.
      name: 'setLocale and the formatters keep their identity across a locale change',
      steps: [
        { type: 'stable', methods: ['setLocale', 'formatNumber', 'formatDate'] },
        { type: 'locale', locale: 'fr' },
        { type: 'stable', methods: ['setLocale', 'formatNumber', 'formatDate'] },
      ],
    },
    { name: 'without an i18n provider', context: { omitServices: ['i18n'] } },
    {
      // A component rendered outside every I18nProvider (above the composition root, in a
      // portal root of its own) translates through the bonded provider and re-renders when
      // that provider switches locale, as the static `t` it replaces would read.
      name: 'outside an i18n provider, follows the bonded provider',
      context: {
        omitServices: ['i18n'],
        translations: { en: { 'nav.home': 'Home' }, fr: { 'nav.home': 'Accueil' } },
      },
      steps: [
        { type: 'call', method: 't', args: ['nav.home'] },
        { type: 'locale', locale: 'fr' },
        { type: 'call', method: 't', args: ['nav.home'] },
      ],
    },
  ],
}

/** `useLocale()`: the current locale code. */
export const useLocaleCases: HookCases = {
  hook: 'useLocale',
  cases: [
    { name: 'en, then a change', steps: [{ type: 'locale', locale: 'de' }] },
    { name: 'follows a switch to the rtl locale', steps: [{ type: 'locale', locale: 'ar' }] },
    {
      name: 'unmount stops locale updates',
      steps: [
        { type: 'locale', locale: 'de' },
        { type: 'unmount' },
        { type: 'locale', locale: 'fr' },
      ],
    },
    { name: 'without an i18n provider', context: { omitServices: ['i18n'] } },
    {
      name: 'outside an i18n provider, follows the bonded provider',
      context: { omitServices: ['i18n'] },
      steps: [{ type: 'locale', locale: 'de' }],
    },
  ],
}

/** `useT()`: the translation function alone, in both call forms. */
export const useTCases: HookCases = {
  hook: 'useT',
  cases: [
    {
      name: 'translates a registered key',
      context: { translations: { en: { 'nav.home': 'Home' } } },
      steps: [{ type: 'call', args: ['nav.home'] }],
    },
    {
      name: 'a string second argument is the default value',
      steps: [{ type: 'call', args: ['nav.missing', 'Not found'] }],
    },
    {
      name: 'the shorthand fallback interpolates values',
      steps: [{ type: 'call', args: ['cart.items', '{{count}} items', { count: 3 }] }],
    },
    {
      name: 'an empty shorthand fallback returns the key',
      steps: [{ type: 'call', args: ['missing.key', ''] }],
    },
    {
      name: 'the provider form with a values map still works',
      steps: [
        { type: 'call', args: ['user.greet', { name: 'Ada' }, { defaultValue: 'Hi {{name}}' }] },
      ],
    },
    {
      name: 'pluralizes with count through the shorthand',
      context: {
        translations: { en: { apple_one: '{{count}} apple', apple_other: '{{count}} apples' } },
      },
      steps: [
        { type: 'call', args: ['apple', 'Lots', { count: 1 }] },
        { type: 'call', args: ['apple', 'Lots', { count: 2 }] },
      ],
    },
    {
      name: 're-reads translations after a locale change',
      context: {
        translations: { en: { 'nav.home': 'Home' }, fr: { 'nav.home': 'Accueil' } },
      },
      steps: [
        { type: 'call', args: ['nav.home'] },
        { type: 'locale', locale: 'fr' },
        { type: 'call', args: ['nav.home'] },
      ],
    },
    {
      name: 'unmount removes the locale listener',
      steps: [
        { type: 'locale', locale: 'fr' },
        { type: 'unmount' },
        { type: 'locale', locale: 'de' },
      ],
    },
    {
      // Documented: one identity while the provider is unchanged, locale changes included.
      name: 'the function keeps one identity across a locale change',
      context: {
        translations: { en: { 'nav.home': 'Home' }, fr: { 'nav.home': 'Accueil' } },
      },
      steps: [
        { type: 'stable' },
        { type: 'locale', locale: 'fr' },
        { type: 'stable' },
        { type: 'call', args: ['nav.home'] },
      ],
    },
    { name: 'without an i18n provider', context: { omitServices: ['i18n'] } },
    {
      name: 'outside an i18n provider, follows the bonded provider',
      context: {
        omitServices: ['i18n'],
        translations: { en: { 'nav.home': 'Home' }, fr: { 'nav.home': 'Accueil' } },
      },
      steps: [
        { type: 'call', args: ['nav.home'] },
        { type: 'locale', locale: 'fr' },
        { type: 'call', args: ['nav.home'] },
      ],
    },
  ],
}

/** `useDirection()`: the active locale's text direction. */
export const useDirectionCases: HookCases = {
  hook: 'useDirection',
  cases: [
    { name: 'ltr for english' },
    { name: 'rtl after a switch to arabic', steps: [{ type: 'locale', locale: 'ar' }] },
    {
      name: 'back to ltr for a locale without a direction',
      steps: [
        { type: 'locale', locale: 'ar' },
        { type: 'locale', locale: 'fr' },
      ],
    },
    {
      name: 'unmount stops direction updates',
      steps: [
        { type: 'locale', locale: 'ar' },
        { type: 'unmount' },
        { type: 'locale', locale: 'fr' },
      ],
    },
    { name: 'without an i18n provider', context: { omitServices: ['i18n'] } },
    {
      name: 'outside an i18n provider, follows the bonded provider',
      context: { omitServices: ['i18n'] },
      steps: [{ type: 'locale', locale: 'ar' }],
    },
  ],
}

/**
 * `useI18nError(error)`: an error's display text. `I18nError` arguments are
 * real instances, so `error instanceof I18nError` runs in every framework.
 */
export const useI18nErrorCases: HookCases = {
  hook: 'useI18nError',
  cases: [
    { name: 'null returns null', args: [null] },
    { name: 'undefined returns null', args: [undefined] },
    { name: 'a plain error returns its message', args: [new Error('Something failed')] },
    {
      name: 'an I18nError translates its key from the dictionary',
      context: {
        translations: { en: { 'auth.error.invalidEmail': 'That email address is invalid' } },
      },
      args: [new I18nError('auth.error.invalidEmail', undefined, 'Invalid email')],
    },
    {
      name: 'an I18nError without a translation shows its own message',
      args: [new I18nError('auth.error.unknown', undefined, 'Something went wrong')],
    },
    {
      name: 'an I18nError interpolates its values',
      context: {
        translations: { en: { 'form.error.required': '{{field}} is required' } },
      },
      args: [new I18nError('form.error.required', { field: 'email' }, 'Required')],
    },
    {
      name: 'the message re-translates after a locale change',
      context: {
        translations: {
          en: { 'auth.error.invalidEmail': 'That email is invalid' },
          fr: { 'auth.error.invalidEmail': 'Cette adresse e-mail est invalide' },
        },
      },
      args: [new I18nError('auth.error.invalidEmail', undefined, 'Invalid email')],
      steps: [
        { type: 'locale', locale: 'fr' },
        { type: 'unmount' },
        { type: 'locale', locale: 'de' },
      ],
    },
    {
      // The result derives only from the argument and the provider, so a
      // framework that re-mounts the host on an `args` step reads the same.
      name: 'a changed argument replaces the message',
      args: [new Error('First failure')],
      steps: [
        { type: 'args', args: [null] },
        { type: 'args', args: [new I18nError('err.wentWrong', undefined, 'Fallback message')] },
        { type: 'args', args: [new Error('Second failure')] },
      ],
    },
    { name: 'without an i18n provider', args: [null], context: { omitServices: ['i18n'] } },
  ],
}

/** `useI18nProvider()`: the raw provider from context. */
export const useI18nProviderCases: HookCases = {
  hook: 'useI18nProvider',
  cases: [
    {
      name: 'returns the provider from context',
      steps: [
        { type: 'call', method: 'getDirection', args: [] },
        { type: 'call', method: 'getLocale', args: [] },
      ],
    },
    {
      name: 'the returned provider follows locale changes',
      steps: [
        { type: 'locale', locale: 'fr' },
        { type: 'call', method: 'getLocale', args: [] },
      ],
    },
    {
      name: 'setLocale through the returned provider switches the locale',
      steps: [
        { type: 'call', method: 'setLocale', args: ['ar'] },
        { type: 'call', method: 'getDirection', args: [] },
      ],
    },
    { name: 'without an i18n provider', context: { omitServices: ['i18n'] } },
  ],
}
