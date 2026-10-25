import { describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '../provider.js'

describe('createSimpleI18nProvider addTranslations notifies only for text t() reads', () => {
  it('notifies when English keys are added while another locale is active', async () => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'fr', name: 'French', translations: { greeting: 'Bonjour' } },
    ])
    await provider.setLocale('fr')
    const listener = vi.fn()
    provider.onLocaleChange(listener)

    provider.addTranslations('en', { lateKey: 'Loaded' })

    expect(listener).toHaveBeenCalledTimes(1)
    // French lacks the key, so t() renders the English text that just arrived.
    expect(provider.t('lateKey')).toBe('Loaded')
  })

  it('stays quiet when the added translations are already registered', () => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: { greeting: 'Hello', nav: { home: 'Home' } } },
    ])
    const listener = vi.fn()
    provider.onLocaleChange(listener)

    provider.addTranslations('en', { greeting: 'Hello', nav: { home: 'Home' } })
    provider.addTranslations('en', {})

    expect(listener).not.toHaveBeenCalled()
  })

  it('stays quiet for an identical namespaced re-registration', () => {
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', { title: 'Pricing' }, 'pricing')
    const listener = vi.fn()
    provider.onLocaleChange(listener)

    provider.addTranslations('en', { title: 'Pricing' }, 'pricing')

    expect(listener).not.toHaveBeenCalled()
    expect(provider.t('pricing.title')).toBe('Pricing')
  })

  it('notifies when a registered value changes, at any depth', () => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: { nav: { home: 'Home' } } },
    ])
    const listener = vi.fn()
    provider.onLocaleChange(listener)

    provider.addTranslations('en', { nav: { home: 'Start' } })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(provider.t('nav.home')).toBe('Start')
  })
})
