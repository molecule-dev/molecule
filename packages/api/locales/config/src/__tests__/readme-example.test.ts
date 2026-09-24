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
    const raw = locales.fr['config.error.validationNotSupported']
    const expected = raw
    expect(typeof raw).toBe('string')
    expect(
      t('config.error.validationNotSupported', undefined, {
        locale: 'fr',
        defaultValue: 'fallback',
      }),
    ).toBe(expected)
  })
})
