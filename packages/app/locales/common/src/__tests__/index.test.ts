import { describe, expect, it } from 'vitest'

import * as bond from '../index.js'
import type { CommonTranslations } from '../index.js'

const REQUIRED_KEYS: Array<keyof CommonTranslations> = [
  'common.close',
  'common.continue',
  'common.goBack',
  'common.loading',
  'common.saving',
  'common.submit',
]

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

  it('english values match the canonical fleet copy', () => {
    expect(bond.en).toEqual({
      'common.close': 'Close',
      'common.continue': 'Continue',
      'common.goBack': 'Go back',
      'common.loading': 'Loading...',
      'common.saving': 'Saving...',
      'common.submit': 'Submit',
    })
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
