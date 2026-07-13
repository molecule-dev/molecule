/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual react-i18next +
 * i18next (through the real `@molecule/app-i18n-i18next` base provider).
 *
 * The unit suite (`index.test.ts`) mocks i18next AND react-i18next, so it can
 * only validate OUR assumptions about them. Most importantly it cannot prove
 * the one thing this package exists for: that `initReactI18next` actually
 * receives the created instance, so `useTranslation()` in components resolves
 * the SAME store the molecule provider mutates. These tests exercise that
 * wiring for real (via react-i18next's `getI18n()`), without rendering React.
 *
 * @module
 */

import { getI18n } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import type { LocaleConfig } from '../types.js'
import { createReactI18nextProvider, provider as defaultProvider } from '../provider.js'

const LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    translations: { greeting: 'Hello', welcome: 'Welcome, {{name}}!', 'en.only': 'English only' },
  },
  { code: 'fr', name: 'Français', translations: { greeting: 'Bonjour' } },
]

describe('@molecule/app-i18n-react-i18next × REAL react-i18next', () => {
  it('full lifecycle: init → React binding wired → translate → switch locale', async () => {
    const p = createReactI18nextProvider({ detection: false, locales: LOCALES })
    await p.initialize()

    // THE React-specific contract: initReactI18next stored OUR instance, so
    // every `useTranslation()` in the tree reads the store this provider
    // mutates. The mocked suite asserts a plugin was "used"; this proves the
    // real wiring took.
    expect(getI18n()).toBe(p.i18n)

    expect(p.t('greeting')).toBe('Hello')
    expect(p.t('welcome', { name: 'Ada' })).toBe('Welcome, Ada!')

    await p.setLocale('fr')
    expect(p.getLocale()).toBe('fr')
    // What a component would render: the React-bound instance sees the change.
    expect(getI18n().t('greeting')).toBe('Bonjour')
    // Partial locale falls back to fallbackLng — English text, not raw keys.
    expect(p.t('en.only')).toBe('English only')
  })

  it('CONSUMER PROPERTY: startup-registered translations survive init AND reach the React binding', async () => {
    // Standard synchronous startup: create provider → setProvider →
    // registerLocaleModule/addTranslations — all before init settles. The
    // replayed bundles must land in the same store React components read.
    const p = createReactI18nextProvider({ detection: false, locales: LOCALES })
    p.addTranslations('en', { 'auth.signIn': 'Sign in' })
    await p.initialize()
    expect(p.t('auth.signIn')).toBe('Sign in')
    expect(getI18n().t('auth.signIn')).toBe('Sign in')
  })

  it('keeps Suspense enabled by default and preserves it under custom i18nextOptions', async () => {
    const p = createReactI18nextProvider({
      detection: false,
      locales: LOCALES,
      i18nextOptions: { returnEmptyString: false },
    })
    await p.initialize()
    const react = p.i18n.options.react as { useSuspense?: boolean }
    expect(react.useSuspense).toBe(true)
    expect(p.i18n.options.returnEmptyString).toBe(false)
  })

  it('FAILURE DISAMBIGUATION: missing key vs defaultValue vs unknown locale', async () => {
    const p = createReactI18nextProvider({ detection: false, locales: LOCALES })
    await p.initialize()

    expect(p.t('nope.missing')).toBe('nope.missing')
    expect(p.exists('nope.missing')).toBe(false)
    expect(p.t('nope.missing', undefined, { defaultValue: 'Fallback' })).toBe('Fallback')
    expect(p.exists('greeting')).toBe(true)

    // Unregistered locale: THROWS, naming the locale — same unified
    // `I18nProvider.setLocale` contract as the base i18next bond and the
    // core simple provider (this wrapper delegates straight to
    // createI18nextProvider's setLocale, so the fix applies here too).
    await expect(p.setLocale('xx')).rejects.toThrow('Locale "xx" not found')
    expect(p.getLocale()).toBe('en')
  })

  it('the module-level default provider initializes without a browser environment', async () => {
    await defaultProvider.initialize()
    expect(defaultProvider.t('missing.key', undefined, { defaultValue: 'ok' })).toBe('ok')
  })
})
