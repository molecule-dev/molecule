/**
 * The provider revision the React store snapshot reads.
 *
 * The revision is an additive, optional part of `I18nProvider`: a provider
 * written before it existed keeps working, and the hook falls back to the
 * listener count. `createSimpleI18nProvider` implements it, so its revision
 * advances even when no `onLocaleChange` listener is attached — which is the
 * case a child's or an earlier sibling's layout effect, or a hidden React
 * Activity tree, leaves the hook in.
 */
import { describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '../provider.js'
import type { I18nProvider, LocaleConfig } from '../types.js'

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
  { code: 'ar', name: 'Arabic', direction: 'rtl', translations: { greeting: 'Marhaba' } },
]

/**
 * Builds the smallest provider that still satisfies `I18nProvider`.
 *
 * @returns A provider written before `getRevision` existed.
 */
function legacyProvider(): I18nProvider {
  return {
    getLocale: () => 'en',
    setLocale: async () => {},
    getLocales: () => [],
    addLocale: () => {},
    removeLocale: () => false,
    addTranslations: () => {},
    t: (key) => key,
    exists: () => false,
    formatNumber: () => '',
    formatDate: () => '',
    formatRelativeTime: () => '',
    formatList: () => '',
    onLocaleChange: () => () => {},
    getDirection: () => 'ltr',
  }
}

describe('I18nProvider.getRevision is additive and optional', () => {
  it('a provider without it still satisfies the interface', () => {
    const provider = legacyProvider()
    expect(provider.getRevision).toBeUndefined()
    // Calling it the way the hook does is a no-op on an older provider.
    expect(provider.getRevision?.()).toBeUndefined()
  })

  it('createSimpleI18nProvider exposes a number', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    expect(typeof provider.getRevision?.()).toBe('number')
  })

  it('each provider instance has its own revision', () => {
    const a = createSimpleI18nProvider('en', LOCALES)
    const b = createSimpleI18nProvider('en', LOCALES)
    a.addTranslations('en', { extra: 'Extra' })
    expect(a.getRevision?.()).toBeGreaterThan(b.getRevision?.() ?? 0)
  })
})

describe('the revision advances for every announced change', () => {
  it('advances with no listener attached', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const before = provider.getRevision?.() ?? 0
    provider.addTranslations('en', { late: 'Loaded' })
    expect(provider.getRevision?.()).toBeGreaterThan(before)
  })

  it('advances on setLocale, addLocale and a successful removeLocale', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const revisions: number[] = [provider.getRevision?.() ?? -1]
    await provider.setLocale('fr')
    revisions.push(provider.getRevision?.() ?? -1)
    provider.addLocale({ code: 'de', name: 'German', translations: { greeting: 'Hallo' } })
    revisions.push(provider.getRevision?.() ?? -1)
    provider.removeLocale('de')
    revisions.push(provider.getRevision?.() ?? -1)
    for (let i = 1; i < revisions.length; i += 1) {
      expect(revisions[i]).toBeGreaterThan(revisions[i - 1])
    }
  })

  it('advances for translations the rendered text falls back to', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    await provider.setLocale('fr')
    const before = provider.getRevision?.() ?? 0
    // French is active and lacks the key; `t()` reads English.
    provider.addTranslations('en', { lateKey: 'Loaded' })
    expect(provider.getRevision?.()).toBeGreaterThan(before)
  })
})

describe('the revision stays quiet when nothing rendered changes', () => {
  it('does not advance for an identical re-registration', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    provider.addTranslations('en', { late: 'Loaded' })
    const afterFirst = provider.getRevision?.() ?? 0
    provider.addTranslations('en', { late: 'Loaded' })
    expect(provider.getRevision?.()).toBe(afterFirst)
  })

  it('does not advance for a locale nothing currently renders', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const before = provider.getRevision?.() ?? 0
    provider.addTranslations('fr', { greeting: 'Salut' })
    expect(provider.getRevision?.()).toBe(before)
  })

  it('does not advance when removing a locale that was never registered', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const before = provider.getRevision?.() ?? 0
    expect(provider.removeLocale('de')).toBe(false)
    expect(provider.getRevision?.()).toBe(before)
  })
})
