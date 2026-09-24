/**
 * Proves the module-level `@example` in `src/index.ts`: registering this bond
 * with `registerLocaleModule` makes `t()` return its translations.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { registerLocaleModule, t } from '@molecule/api-i18n'

import * as locales from '../index.js'

describe('README @example', () => {
  it('registerLocaleModule(locales) serves the bond’s French string per request', () => {
    registerLocaleModule(locales)
    const values = { path: 'Ada', error: 'Ada' }
    const raw = locales.fr['codeSandbox.docker.error.readFailed']
    const expected = Object.entries(values).reduce(
      (s, [k, v]) => s.split(`{{${k}}}`).join(String(v)),
      String(raw),
    )
    expect(typeof raw).toBe('string')
    expect(
      t('codeSandbox.docker.error.readFailed', values, { locale: 'fr', defaultValue: 'fallback' }),
    ).toBe(expected)
  })
})
