import { describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '../provider.js'

describe('createSimpleI18nProvider addTranslations notifications', () => {
  it('notifies subscribers when keys are added for the ACTIVE locale', () => {
    const provider = createSimpleI18nProvider('en')
    const listener = vi.fn()
    provider.onLocaleChange(listener)

    provider.addTranslations('en', { lateKey: 'Loaded' })

    expect(listener).toHaveBeenCalledTimes(1)
    // The listener must be able to read the merged keys when it runs.
    expect(provider.t('lateKey')).toBe('Loaded')
  })

  it('notifies when a new locale is auto-created so language pickers see it', () => {
    const provider = createSimpleI18nProvider('en')
    const listener = vi.fn()
    provider.onLocaleChange(listener)

    provider.addTranslations('de', { lateKey: 'Geladen' })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(provider.getLocales().some((locale) => locale.code === 'de')).toBe(true)
  })

  it('stays quiet for a different, already-registered locale', () => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'fr', name: 'French', translations: {} },
    ])
    const listener = vi.fn()
    provider.onLocaleChange(listener)

    provider.addTranslations('fr', { lateKey: 'Chargé' })

    expect(listener).not.toHaveBeenCalled()
    // The active locale's text is unchanged; the next switch picks the key up.
    expect(provider.t('lateKey', undefined, { defaultValue: 'missing' })).toBe('missing')
  })
})
