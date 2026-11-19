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

/**
 * Every language export, read from the module's real named exports and
 * checked against `LegalContent` at compile time. Keyed by exactly the
 * codes in `LANGUAGES`, so a missing, extra or mistyped entry is a type
 * error instead of a runtime `undefined`.
 */
const CONTENT: Record<(typeof LANGUAGES)[number], LegalContent> = {
  af: bond.af,
  am: bond.am,
  ar: bond.ar,
  az: bond.az,
  bg: bond.bg,
  bn: bond.bn,
  bs: bond.bs,
  ca: bond.ca,
  cs: bond.cs,
  cy: bond.cy,
  da: bond.da,
  de: bond.de,
  el: bond.el,
  en: bond.en,
  es: bond.es,
  et: bond.et,
  eu: bond.eu,
  fa: bond.fa,
  fi: bond.fi,
  fil: bond.fil,
  fr: bond.fr,
  ga: bond.ga,
  gl: bond.gl,
  gu: bond.gu,
  he: bond.he,
  hi: bond.hi,
  hr: bond.hr,
  hu: bond.hu,
  hy: bond.hy,
  id: bond.id,
  is: bond.is,
  it: bond.it,
  ja: bond.ja,
  ka: bond.ka,
  kk: bond.kk,
  km: bond.km,
  kn: bond.kn,
  ko: bond.ko,
  lo: bond.lo,
  lt: bond.lt,
  lv: bond.lv,
  mk: bond.mk,
  ml: bond.ml,
  mn: bond.mn,
  mr: bond.mr,
  ms: bond.ms,
  mt: bond.mt,
  my: bond.my,
  nb: bond.nb,
  ne: bond.ne,
  nl: bond.nl,
  pa: bond.pa,
  pl: bond.pl,
  pt: bond.pt,
  ro: bond.ro,
  ru: bond.ru,
  si: bond.si,
  sk: bond.sk,
  sl: bond.sl,
  sq: bond.sq,
  sr: bond.sr,
  sv: bond.sv,
  sw: bond.sw,
  ta: bond.ta,
  te: bond.te,
  th: bond.th,
  tr: bond.tr,
  uk: bond.uk,
  ur: bond.ur,
  uz: bond.uz,
  vi: bond.vi,
  zh: bond.zh,
  zhTW: bond.zhTW,
  zu: bond.zu,
}

describe('@molecule/app-locales-legal-default', () => {
  it('exports legal content for every supported language', () => {
    for (const lang of LANGUAGES) {
      expect(bond, `missing export: ${lang}`).toHaveProperty(lang)
      const data = CONTENT[lang]
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
