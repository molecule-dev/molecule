import { describe, expect, it } from 'vitest'

import { LANGUAGE_DEFINITIONS } from '../index.js'

describe('@molecule/app-i18n-default-react', () => {
  it('exports 80 language definitions', () => {
    expect(LANGUAGE_DEFINITIONS).toHaveLength(80)
  })

  it('first entry is English (default locale)', () => {
    expect(LANGUAGE_DEFINITIONS[0]).toEqual({ code: 'en', name: 'English', direction: 'ltr' })
  })

  it('includes 4 RTL languages (ar, fa, he, ur)', () => {
    const rtl = LANGUAGE_DEFINITIONS.filter((l) => l.direction === 'rtl').map((l) => l.code)
    expect(rtl.sort()).toEqual(['ar', 'fa', 'he', 'ur'])
  })

  it('every language has a non-empty native name', () => {
    for (const lang of LANGUAGE_DEFINITIONS) {
      expect(lang.name, `${lang.code} missing name`).toBeTruthy()
    }
  })

  it('language codes are unique', () => {
    const codes = LANGUAGE_DEFINITIONS.map((l) => l.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
