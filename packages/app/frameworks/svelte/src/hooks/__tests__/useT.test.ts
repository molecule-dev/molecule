// @vitest-environment jsdom
/**
 * `useT`/`useTranslation`: React's `useT` cases in Svelte's idiom. The hook
 * runs once during component init and returns tracked functions and stores;
 * text written as `t(…)` in markup re-evaluates on a locale notification, and
 * `useT()`'s function keeps one identity for the component's lifetime, so an
 * effect that mentions it runs once.
 *
 * @module
 */

import { flushSync } from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import type { UseTFunction } from '../useTranslation.js'
import CallShapes from './i18n/CallShapes.svelte'
import IdentityProbe from './i18n/IdentityProbe.svelte'
import InlineFallback from './i18n/InlineFallback.svelte'
import { cleanupMounted, mountUnder, textOf } from './i18n/mount.js'
import TranslationGreeting from './i18n/TranslationGreeting.svelte'
import TText from './i18n/TText.svelte'

afterEach(cleanupMounted)

/**
 * Locales used by every probe. `greeting` exists in both so a locale switch is
 * observable; `welcome`/`item_*` cover the values/count call shapes.
 */
const LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    translations: {
      greeting: 'Hello',
      welcome: 'Welcome, {{name}}!',
      item_one: '{{count}} item',
      item_other: '{{count}} items',
    },
  },
  { code: 'fr', name: 'French', translations: { greeting: 'Bonjour' } },
]

describe('useT', () => {
  it('re-renders on a locale change when the component uses only useT()', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, TText, { textKey: 'greeting', fallback: 'Hello', testId: 'text' })
    expect(textOf('text')).toBe('Hello')

    await provider.setLocale('fr')
    flushSync()
    expect(textOf('text')).toBe('Bonjour')
  })

  it('re-renders when addTranslations adds keys for the active locale', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, TText, { textKey: 'lateKey', fallback: 'Pending', testId: 'late' })
    expect(textOf('late')).toBe('Pending')

    provider.addTranslations('en', { lateKey: 'Loaded' })
    flushSync()
    expect(textOf('late')).toBe('Loaded')
  })

  it('keeps the returned identity across re-renders AND locale changes', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const seen: UseTFunction[] = []
    const bump = writable(0)
    mountUnder(provider, IdentityProbe, {
      bump,
      onRender: (t: UseTFunction) => seen.push(t),
      onEffectRun: () => {},
    })
    const first = seen[seen.length - 1]
    // A bump re-evaluates the component the way React's `rerender` re-runs the body.
    bump.set(1)
    flushSync()
    expect(seen[seen.length - 1]).toBe(first)

    const rendersBefore = seen.length
    await provider.setLocale('fr')
    flushSync()
    // The component re-evaluated (so text is fresh) AND the function identity survived.
    expect(seen.length).toBeGreaterThan(rendersBefore)
    expect(seen[seen.length - 1]).toBe(first)
    expect(textOf('text')).toBe('Bonjour')
  })

  it('does not re-run an effect that depends on the returned function', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    let effectRuns = 0
    const bump = writable(0)
    mountUnder(provider, IdentityProbe, {
      bump,
      onRender: () => {},
      onEffectRun: () => {
        effectRuns += 1
      },
    })
    bump.set(1)
    flushSync()
    await provider.setLocale('fr')
    flushSync()
    // The l63 failure class: a per-render identity re-ran this effect forever.
    expect(effectRuns).toBe(1)
    expect(textOf('text')).toBe('Bonjour')
  })

  it('moves the subscription when the provider instance is replaced', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: { greeting: 'Salut from B' } },
    ])
    const unsubscribeA = vi.fn()
    const onLocaleChangeA = providerA.onLocaleChange.bind(providerA)
    providerA.onLocaleChange = (listener) => {
      const unsubscribe = onLocaleChangeA(listener)
      return () => {
        unsubscribeA()
        unsubscribe()
      }
    }

    const first = mountUnder(providerA, TText, {
      textKey: 'greeting',
      fallback: 'Hello',
      testId: 'text',
    })
    expect(textOf('text')).toBe('Hello')

    // Svelte's context is read once per tree, so a different provider instance
    // is a different tree: the subtree is mounted again under it, and the old
    // subscription is torn down (React updates in place because a provider is a
    // component prop there).
    await first.stop()
    mountUnder(providerB, TText, { textKey: 'greeting', fallback: 'Hello', testId: 'text' })
    expect(unsubscribeA).toHaveBeenCalledTimes(1)
    expect(textOf('text')).toBe('Salut from B')

    providerB.addTranslations('en', { greeting: 'Salut encore' })
    flushSync()
    expect(textOf('text')).toBe('Salut encore')
  })

  it('unsubscribes when the component unmounts', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const unsubscribe = vi.fn()
    const onLocaleChange = provider.onLocaleChange.bind(provider)
    provider.onLocaleChange = (listener) => {
      const stop = onLocaleChange(listener)
      return () => {
        unsubscribe()
        stop()
      }
    }

    const tree = mountUnder(provider, TText, {
      textKey: 'greeting',
      fallback: 'Hello',
      testId: 'text',
    })
    await tree.stop()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('preserves the existing values/defaultValue/count call shapes', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, CallShapes, {})

    expect(textOf('values')).toBe('Welcome, Alice!')
    expect(textOf('default')).toBe('Fallback')
    expect(textOf('plural')).toBe('2 items')
    expect(textOf('count-fallback')).toBe('3 things')
  })

  it('accepts an inline fallback string as the second argument', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, InlineFallback, {})

    expect(textOf('fallback')).toBe('English fallback')
    expect(textOf('translated')).toBe('Hello')
    expect(textOf('interpolated')).toBe('3 items')
    expect(textOf('plural')).toBe('1 item')
  })
})

describe('useTranslation (control — existing behaviour)', () => {
  it('still re-renders on a locale change and translates', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    mountUnder(provider, TranslationGreeting, {})
    expect(textOf('text')).toBe('en:Hello')

    await provider.setLocale('fr')
    flushSync()
    expect(textOf('text')).toBe('fr:Bonjour')
  })
})
