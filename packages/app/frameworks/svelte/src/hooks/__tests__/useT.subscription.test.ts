// @vitest-environment jsdom
/**
 * React's `useT.subscription` cases in Svelte's idiom: a notification fired
 * before a reader's first evaluation is still shown, a replaced provider moves
 * the subscription, and the one live subscription ends at unmount.
 *
 * Svelte has no `Activity`/`StrictMode`, and its context is set once per tree
 * instead of being a component prop, so the cases that replace a provider in
 * place or hide a subtree are exercised by mounting the subtree again — what a
 * caller observes either way: new text, one live subscription, none at unmount.
 *
 * @module
 */

import { flushSync } from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig, Translations } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import type { UseTFunction } from '../useTranslation.js'
import { cleanupMounted, mountUnder, settle, textOf } from './i18n/mount.js'
import SelfRegistering from './i18n/SelfRegistering.svelte'
import ShellAddScene from './i18n/ShellAddScene.svelte'
import ShellSwitchScene from './i18n/ShellSwitchScene.svelte'
import SiblingScene from './i18n/SiblingScene.svelte'
import TranslationDetail from './i18n/TranslationDetail.svelte'
import TText from './i18n/TText.svelte'
import type { DetailEntry } from './i18n/types.js'

afterEach(cleanupMounted)

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
  { code: 'ar', name: 'Arabic', direction: 'rtl', translations: { greeting: 'Marhaba' } },
]

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

const LATE: Translations = { late: 'Loaded' }

describe('a notification fired before the hook subscribes', () => {
  it("useT: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, SiblingScene, {
      provider,
      action: 'switch',
      to: 'fr',
      reader: 'greeting-t',
      readerTestId: 'text',
    })
    await settle()
    expect(textOf('text')).toBe('Bonjour')
  })

  it("useT: from a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, ShellSwitchScene, { provider, to: 'fr' })
    await settle()
    expect(textOf('shell')).toBe('Bonjour')
  })

  it("useTranslation: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, SiblingScene, {
      provider,
      action: 'switch',
      to: 'ar',
      reader: 'translation',
      readerTestId: 'text',
    })
    await settle()
    expect(textOf('text')).toBe('ar/rtl:Marhaba')
  })

  it("useT: translations added in a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, ShellAddScene, { provider, translations: LATE })
    await settle()
    expect(textOf('shell')).toBe('Loaded')
  })

  it("useTranslation: translations added in an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, SiblingScene, {
      provider,
      action: 'add',
      translations: LATE,
      reader: 'translation',
      readerTestId: 'text',
      detailText: 'late',
      detailShowLocale: false,
    })
    await settle()
    expect(textOf('text')).toBe('Loaded')
  })
})

describe('a provider replaced in place (no remount)', () => {
  it('useTranslation: no commit pairs the new provider with the old locale and direction', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('ar', LOCALES)
    const commits: string[] = []
    const record = (entry: DetailEntry): void => {
      commits.push(`${entry.locale}/${entry.direction}:${entry.text}`)
    }
    const tree = mountUnder(providerA, TranslationDetail, { onRender: record })
    // A replaced provider is a new tree in Svelte (context is set once), so the
    // subtree is mounted again under it and its first evaluation is recorded.
    await tree.stop()
    mountUnder(providerB, TranslationDetail, { onRender: record })
    expect(commits).toEqual(['en/ltr:Hello', 'ar/rtl:Marhaba'])
  })

  it('useT: moves its subscription and changes its identity once', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)
    const seen: UseTFunction[] = []
    const props = {
      textKey: 'greeting',
      fallback: 'Hello',
      testId: 'text',
      onRender: (t: UseTFunction) => seen.push(t),
    }

    const tree = mountUnder(providerA, TText, props)
    const first = seen[seen.length - 1]
    await tree.stop()
    mountUnder(providerB, TText, props)
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(seen[seen.length - 1]).not.toBe(first)

    providerB.addTranslations('fr', { greeting: 'Salut' })
    flushSync()
    expect(textOf('text')).toBe('Salut')
  })
})

describe('subscription lifecycle', () => {
  it('useT: one live subscription under StrictMode, updates, none after unmount', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    // StrictMode has no Svelte counterpart; what a caller observes is one live
    // subscription for the mounted tree, updates before unmount, none after.
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
})

describe('translations the rendered text depends on', () => {
  it('useT: re-renders when English keys arrive while another locale is active', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, TText, { textKey: 'lateKey', fallback: 'Pending', testId: 'late' })

    await provider.setLocale('fr')
    flushSync()
    provider.addTranslations('en', { lateKey: 'Loaded' })
    flushSync()
    // `t()` falls back to English for a key French lacks.
    expect(textOf('late')).toBe('Loaded')
  })

  it('re-registering the same translations while rendering does not loop', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const bump = writable(0)
    mountUnder(provider, SelfRegistering, { provider, bump })
    expect(textOf('own')).toBe('Own text')

    // A second evaluation re-registers the same translations; a notification
    // would loop forever.
    bump.set(1)
    flushSync()
    expect(textOf('own')).toBe('Own text')
  })
})
