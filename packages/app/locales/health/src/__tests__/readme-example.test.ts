/**
 * Proves the module-level `@example` in `src/index.ts`: registering this bond
 * with `registerLocaleModule` makes `t()` return its translations.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { registerLocaleModule, setLocale, t } from '@molecule/app-i18n'

import * as locales from '../index.js'

describe('README @example', () => {
  it('registerLocaleModule(locales) + setLocale serves the bond’s French string', async () => {
    registerLocaleModule(locales)
    await setLocale('fr')
    const values = { hours: 3, minutes: 3 }
    const raw = locales.fr['health.durationHoursMinutes']
    const expected = Object.entries(values).reduce(
      (s, [k, v]) => s.split(`{{${k}}}`).join(String(v)),
      String(raw),
    )
    expect(typeof raw).toBe('string')
    expect(t('health.durationHoursMinutes', values, { defaultValue: 'fallback' })).toBe(expected)
  })
})
