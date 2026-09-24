/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { t } from '@molecule/app-i18n'

import { setupI18nDefault } from '../index.js'

describe('README @example', () => {
  it('bonds an English-first provider, merges the common bond and lazy-loads other locales', async () => {
    // The app's own UI strings — in a scaffolded app these are `src/locales/<code>/ui.ts`.
    const enUi = { 'trips.title': 'My trips' }
    const uiByLocale: Record<string, Record<string, string>> = {
      es: { 'trips.title': 'Mis viajes' },
    }

    const i18n = setupI18nDefault({
      enUi,
      lazyLoadUi: async (code) => uiByLocale[code] ?? {},
      supportedLocales: ['es'],
    })

    expect(t('trips.title')).toBe('My trips')
    expect(t('common.close')).toBe('Close')
    expect(
      i18n
        .getLocales()
        .map((l) => l.code)
        .sort(),
    ).toEqual(['en', 'es'])

    await i18n.setLocale('es')
    expect(i18n.getLocale()).toBe('es')
    expect(t('trips.title')).toBe('Mis viajes')
    expect(t('common.close')).toBe('Cerrar')
  })
})
