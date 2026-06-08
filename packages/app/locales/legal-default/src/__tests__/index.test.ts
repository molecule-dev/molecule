import { describe, expect, it } from 'vitest'

import type { LegalContent } from '../index.js'
import * as bond from '../index.js'

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

describe('@molecule/app-locales-legal-default', () => {
  it('exports legal content for every supported language', () => {
    for (const lang of LANGUAGES) {
      expect(bond, `missing export: ${lang}`).toHaveProperty(lang)
      const data = (bond as Record<string, LegalContent>)[lang]
      expect(data['content.privacyPolicy'], `${lang} missing privacyPolicy`).toBeTruthy()
      expect(data['content.termsOfService'], `${lang} missing termsOfService`).toBeTruthy()
    }
  })

  it('english privacy policy starts with the canonical summary line', () => {
    expect(bond.en['content.privacyPolicy']).toContain('In summary: We do not track you')
  })

  it('english terms of service starts with the canonical Terms section', () => {
    expect(bond.en['content.termsOfService']).toContain('<h2>1. Terms</h2>')
  })

  it('{{appName}} placeholder is preserved (not pre-interpolated)', () => {
    expect(bond.en['content.privacyPolicy']).toContain('{{appName}}')
    expect(bond.fr['content.privacyPolicy']).toContain('{{appName}}')
  })
})
