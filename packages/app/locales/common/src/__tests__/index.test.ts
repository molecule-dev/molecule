import { describe, expect, it } from 'vitest'

import type { CommonTranslations } from '../index.js'
import * as bond from '../index.js'

// Sample of the 178 keys — the test confirms every language has these specific
// values and that escape sequences round-trip correctly. Full key list lives
// in CommonTranslations interface.
const SPOT_CHECK_KEYS: Array<keyof CommonTranslations> = [
  'common.close',
  'common.continue',
  'common.goBack',
  'common.loading',
  'common.saving',
  'common.submit',
  'auth.login.email',
  'auth.error.loginFailed',
  'settings.changePassword',
  'footer.about',
  'oauth.orContinueWith',
  'theme.toggle',
]
const REQUIRED_KEYS = SPOT_CHECK_KEYS

// Identifier-style language names exported from each *.ts file.
const LANGUAGES = [
  'af',
  'am',
  'ar',
  'az',
  'bg',
  'bn',
  'bs',
  'ca',
  'cs',
  'cy',
  'da',
  'de',
  'el',
  'en',
  'es',
  'et',
  'eu',
  'fa',
  'fi',
  'fil',
  'fr',
  'ga',
  'gl',
  'gu',
  'he',
  'hi',
  'hr',
  'hu',
  'hy',
  'id',
  'is',
  'it',
  'ja',
  'ka',
  'kk',
  'km',
  'kn',
  'ko',
  'lo',
  'lt',
  'lv',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'nb',
  'ne',
  'nl',
  'pa',
  'pl',
  'pt',
  'ro',
  'ru',
  'si',
  'sk',
  'sl',
  'sq',
  'sr',
  'sv',
  'sw',
  'ta',
  'te',
  'th',
  'tr',
  'uk',
  'ur',
  'uz',
  'vi',
  'zh',
  'zhTW',
  'zu',
]

describe('@molecule/app-locales-common', () => {
  it('exports a constant for every supported language', () => {
    for (const lang of LANGUAGES) {
      expect(bond, `missing export: ${lang}`).toHaveProperty(lang)
    }
  })

  it('every language defines all six required keys with non-empty strings', () => {
    for (const lang of LANGUAGES) {
      const translations = (bond as Record<string, CommonTranslations>)[lang]
      for (const key of REQUIRED_KEYS) {
        expect(translations[key], `${lang} missing ${key}`).toBeTruthy()
        expect(typeof translations[key], `${lang} ${key} should be a string`).toBe('string')
      }
    }
  })

  it('english values match the canonical fleet copy (spot checks)', () => {
    expect(bond.en['common.close']).toBe('Close')
    expect(bond.en['common.continue']).toBe('Continue')
    expect(bond.en['common.goBack']).toBe('Go back')
    expect(bond.en['common.loading']).toBe('Loading...')
    expect(bond.en['common.saving']).toBe('Saving...')
    expect(bond.en['common.submit']).toBe('Submit')
    expect(bond.en['auth.login.email']).toBe('Email')
    expect(bond.en['auth.error.loginFailed']).toBe('Login failed')
    expect(bond.en['settings.changePassword']).toBe('Change password')
    expect(bond.en['footer.about']).toBe('About {{appName}}')
    expect(bond.en['oauth.orContinueWith']).toBe('Or continue with')
    expect(bond.en['theme.toggle']).toBe('Toggle theme')
  })

  it('apostrophe-containing values (Catalan) round-trip with a real apostrophe', () => {
    // Catalan has values with apostrophes (e.g. "Error d'inici de sessió"); the
    // runtime value must be a real apostrophe, NOT an HTML entity (&#39;) —
    // guards against the entity-contamination regression.
    expect(bond.ca['auth.error.loginFailed']).toBe("Error d'inici de sessió")
    expect(bond.ca['auth.error.loginFailed']).not.toContain('&#39;')
  })

  it('non-Latin scripts round-trip correctly (no double-escape bug)', () => {
    // The original Armenian source uses \uXXXX escapes; TypeScript compiles
    // them to actual Cyrillic chars at runtime. Verify the runtime value is
    // the actual char, not a literal backslash-escape string.
    expect(bond.hy['common.close']).toBe('Փակել')
    expect(bond.hy['common.close']).not.toMatch(/\\u/)
    // Arabic (RTL — no escape sequences in source)
    expect(bond.ar['common.close']).toBe('إغلاق')
    // Chinese
    expect(bond.zh['common.loading']).toBe('加载中...')
  })
})
