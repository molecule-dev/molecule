// @vitest-environment jsdom
/**
 * React's `useT.snapshot-completeness` cases in Svelte's idiom: a change
 * announced before a reader evaluates is still shown, because `useT()` and
 * `useTranslation()` read the provider through a store the notification
 * reaches. The hidden-`Activity` and `StrictMode` cases have no Svelte
 * counterpart: what a caller observes there — text shown after the effects
 * come back, one live subscription for the mounted tree — is what these
 * tests assert by unmounting and mounting the subtree again.
 *
 * @module
 */

import { flushSync } from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig, Translations } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import type { UseTFunction } from '../useTranslation.js'
import IdentityProbe from './i18n/IdentityProbe.svelte'
import { cleanupMounted, mountUnder, settle, textOf } from './i18n/mount.js'
import SelfRegistering from './i18n/SelfRegistering.svelte'
import ShellAddScene from './i18n/ShellAddScene.svelte'
import ShellSwitchScene from './i18n/ShellSwitchScene.svelte'
import ShellTranslationAddScene from './i18n/ShellTranslationAddScene.svelte'
import SiblingScene from './i18n/SiblingScene.svelte'
import TranslationDetail from './i18n/TranslationDetail.svelte'
import TText from './i18n/TText.svelte'

afterEach(cleanupMounted)

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
]

const LATE: Translations = { late: 'Loaded' }

/**
 * Counts the provider's live `onLocaleChange` subscriptions.
 *
 * @param provider - The provider to wrap.
 * @returns A reader of the live count.
 */
function trackSubscriptions(provider: I18nProvider): () => number {
  const subscribe = provider.onLocaleChange.bind(provider)
  let live = 0
  provider.onLocaleChange = (listener) => {
    live += 1
    const unsubscribe = subscribe(listener)
    let done = false
    return () => {
      if (!done) {
        done = true
        live -= 1
      }
      unsubscribe()
    }
  }
  return () => live
}

describe("a same-locale add in a child's layout effect", () => {
  it('useT: the parent renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, ShellAddScene, { provider, translations: LATE })
    await settle()
    expect(textOf('shell')).toBe('Loaded')
  })

  it('useTranslation: the parent renders the added text with the current locale/direction', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, ShellTranslationAddScene, { provider, translations: LATE })
    await settle()
    expect(textOf('shell')).toBe('en/ltr:Loaded')
  })
})

describe("a same-locale add in an earlier sibling's layout effect", () => {
  it('useT: the later sibling renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, SiblingScene, {
      provider,
      action: 'add',
      translations: LATE,
      reader: 'late-t',
      readerTestId: 'late',
    })
    await settle()
    expect(textOf('late')).toBe('Loaded')
  })

  it('useTranslation: the later sibling renders text and locale together', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, SiblingScene, {
      provider,
      action: 'add',
      translations: LATE,
      reader: 'translation',
      readerTestId: 'detail',
      detailText: 'both',
    })
    await settle()
    expect(textOf('detail')).toBe('en/ltr:Hello|Loaded')
  })
})

describe('a same-locale change while React Activity is hidden', () => {
  it('useT: effects are unmounted while hidden and the text updates on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    const tree = mountUnder(provider, TranslationDetail, { text: 'both' })
    expect(textOf('detail')).toBe('en/ltr:Hello|Pending')
    expect(live()).toBe(1)

    // The premise of the case: a hidden tree has no effects, so no listener exists.
    await tree.stop()
    expect(live()).toBe(0)
    provider.addTranslations('en', LATE)
    mountUnder(provider, TranslationDetail, { text: 'both' })
    await settle()
    expect(textOf('detail')).toBe('en/ltr:Hello|Loaded')
  })

  it('useTranslation: a locale switch while hidden is shown on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const tree = mountUnder(provider, TranslationDetail, { text: 'both' })

    await tree.stop()
    await provider.setLocale('fr')
    mountUnder(provider, TranslationDetail, { text: 'both' })
    await settle()
    expect(textOf('detail')).toBe('fr/ltr:Bonjour|Pending')
  })
})

describe('a locale switch before the reader evaluates', () => {
  it("useT: a child's layout-effect switch is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, ShellSwitchScene, { provider, to: 'fr' })
    await settle()
    expect(textOf('shell')).toBe('Bonjour')
  })
})

describe('ordinary effects and notifications stay green', () => {
  it("useT: an add from the reader's own mount effect is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, ShellAddScene, { provider, translations: LATE })
    await settle()
    expect(textOf('shell')).toBe('Loaded')
  })

  it('useT: a later add while mounted re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, TText, { textKey: 'late', fallback: 'Pending', testId: 'late' })
    provider.addTranslations('en', LATE)
    flushSync()
    expect(textOf('late')).toBe('Loaded')
  })

  it('useT: an English fallback added while French is active re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, TText, { textKey: 'late', fallback: 'Pending', testId: 'late' })

    await provider.setLocale('fr')
    flushSync()
    provider.addTranslations('en', LATE)
    flushSync()
    expect(textOf('late')).toBe('Loaded')
  })

  it('useT: an unchanged re-registration while rendering does not loop', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const bump = writable(0)
    let evaluations = 0
    mountUnder(provider, SelfRegistering, {
      provider,
      bump,
      onRender: () => {
        evaluations += 1
      },
    })
    expect(textOf('own')).toBe('Own text')

    // A second evaluation re-registers the same translations; a notification
    // would loop forever.
    bump.set(1)
    flushSync()
    expect(textOf('own')).toBe('Own text')
    expect(evaluations).toBeLessThanOrEqual(3)
  })
})

describe('identity, lifecycle and provider replacement fixes are preserved', () => {
  it('useT: one callback identity across re-renders and a locale change, one effect run', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const seen: UseTFunction[] = []
    let effectRuns = 0
    const bump = writable(0)
    mountUnder(provider, IdentityProbe, {
      bump,
      onRender: (t: UseTFunction) => seen.push(t),
      onEffectRun: () => {
        effectRuns += 1
      },
    })
    const first = seen[0]

    await provider.setLocale('fr')
    flushSync()
    expect(new Set(seen).size).toBe(1)
    expect(seen[0]).toBe(first)
    expect(effectRuns).toBe(1)
    expect(textOf('text')).toBe('Bonjour')
  })

  it('useT: one live subscription under StrictMode and none after unmount', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    const tree = mountUnder(provider, TText, {
      textKey: 'greeting',
      fallback: 'Hello',
      testId: 'text',
    })
    expect(live()).toBe(1)

    await provider.setLocale('fr')
    flushSync()
    expect(textOf('text')).toBe('Bonjour')

    await tree.stop()
    expect(live()).toBe(0)
  })

  it('useT: replacing the provider in place moves the subscription and updates text', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)
    const props = { textKey: 'greeting', fallback: 'Hello', testId: 'text' }

    const tree = mountUnder(providerA, TText, props)
    await tree.stop()
    mountUnder(providerB, TText, props)
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(textOf('text')).toBe('Bonjour')

    providerB.addTranslations('fr', { greeting: 'Salut' })
    flushSync()
    expect(textOf('text')).toBe('Salut')
  })

  it('useT: a provider without getRevision still re-renders on ordinary notifications', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    // A provider written before the revision method existed: the hook must fall
    // back to counting notifications, exactly as it did on the accepted tree.
    const withoutRevision: { getRevision?: () => number } = provider
    delete withoutRevision.getRevision
    mountUnder(provider, TText, { textKey: 'late', fallback: 'Pending', testId: 'late' })

    provider.addTranslations('en', LATE)
    flushSync()
    expect(textOf('late')).toBe('Loaded')
  })
})
