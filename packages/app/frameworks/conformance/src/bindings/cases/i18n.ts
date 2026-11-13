/**
 * Cases for the i18n hooks.
 *
 * @module
 */

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
  ],
}

/** `useLocale()`: the current locale code. */
export const useLocaleCases: HookCases = {
  hook: 'useLocale',
  cases: [{ name: 'en, then a change', steps: [{ type: 'locale', locale: 'de' }] }],
}
