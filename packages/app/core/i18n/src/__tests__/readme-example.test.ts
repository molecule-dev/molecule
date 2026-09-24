/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real i18next bond and the
 * real `@molecule/app-locales-common` locale bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { createI18nextProvider } from '@molecule/app-i18n-i18next'
import * as commonLocales from '@molecule/app-locales-common'

import { getLocale, registerLocaleModule, setLocale, setProvider, t } from '../index.js'

describe('README @example', () => {
  it('registers a locale bond and translates through the bonded i18next provider', async () => {
    const i18n = createI18nextProvider({ defaultLocale: 'en', detection: false })
    setProvider(i18n)
    registerLocaleModule(commonLocales)
    await i18n.initialize()

    expect(t('common.close', undefined, { defaultValue: 'Close' })).toBe('Close')

    await setLocale('fr')
    expect(getLocale()).toBe('fr')
    expect(t('common.close', undefined, { defaultValue: 'Close' })).toBe('Fermer')
    expect(t('footer.about', { appName: 'Acme' }, { defaultValue: 'About {{appName}}' })).toBe(
      'À propos de Acme',
    )

    await expect(setLocale('xx-never-registered')).rejects.toThrow(/not found/)
  })
})
