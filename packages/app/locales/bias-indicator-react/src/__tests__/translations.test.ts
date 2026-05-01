import { describe, expect, it } from 'vitest'

import * as locales from '../index.js'
import type { BiasIndicatorTranslationKey, BiasIndicatorTranslations } from '../types.js'

const REQUIRED_KEYS: BiasIndicatorTranslationKey[] = [
  'biasIndicator.bias.farLeft',
  'biasIndicator.bias.leftLeaning',
  'biasIndicator.bias.center',
  'biasIndicator.bias.rightLeaning',
  'biasIndicator.bias.farRight',
  'biasIndicator.reliability.high',
  'biasIndicator.reliability.medium',
  'biasIndicator.reliability.low',
  'biasIndicator.reliability.disputed',
]

const allLocales = Object.entries(locales).filter(
  ([, value]) =>
    typeof value === 'object' &&
    value !== null &&
    'biasIndicator.bias.center' in (value as Record<string, unknown>),
) as Array<[string, BiasIndicatorTranslations]>

describe('@molecule/app-locales-bias-indicator-react', () => {
  it('exports translations for 79 languages', () => {
    expect(allLocales.length).toBe(79)
  })

  it('English locale has the expected literal labels', () => {
    expect(locales.en['biasIndicator.bias.center']).toBe('Center')
    expect(locales.en['biasIndicator.reliability.high']).toBe('Reliability: high')
  })

  it.each(REQUIRED_KEYS)('every locale supplies %s', (key) => {
    for (const [name, table] of allLocales) {
      expect(typeof table[key], `${name} missing key ${key}`).toBe('string')
      expect(table[key].length, `${name} has empty key ${key}`).toBeGreaterThan(0)
    }
  })
})
