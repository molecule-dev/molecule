// @vitest-environment jsdom
/**
 * How many times a component that calls `useTranslation()` evaluates when the
 * provider changes: once per locale switch and once per `addTranslations`,
 * with `t` following the locale and `locales` following every notification.
 *
 * React re-runs the hook's body on each notification, so its `t` is rebuilt on
 * a locale switch. A Svelte hook runs once during component init: its `t` is
 * one plain function that reads the locale version when called, and its
 * `locales` is a store. What a caller observes is ported here: the text is
 * retranslated, `locales` is a new list per notification and the same list
 * across an ordinary re-evaluation.
 *
 * @module
 */

import { flushSync } from 'svelte'
import { type Writable, writable } from 'svelte/store'
import { afterEach, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import BodyRunsProbe from './i18n/BodyRunsProbe.svelte'
import { cleanupMounted, mountUnder, textOf } from './i18n/mount.js'
import type { RunSnapshot } from './i18n/types.js'

afterEach(cleanupMounted)

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
]

/**
 * Mounts the recorder, which hands over one snapshot per evaluation.
 *
 * @param provider - The i18n provider to read.
 * @returns The recorded snapshots and the bump store that forces a re-evaluation.
 */
function mountRecorder(provider: I18nProvider): {
  runs: RunSnapshot[]
  bump: Writable<number>
} {
  const runs: RunSnapshot[] = []
  const bump = writable(0)
  mountUnder(provider, BodyRunsProbe, {
    bump,
    onRun: (snapshot: RunSnapshot) => runs.push(snapshot),
  })
  return { runs, bump }
}

describe('useTranslation evaluations', () => {
  it('runs the body once per locale switch, with a new t and a new locales list', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { runs } = mountRecorder(provider)
    expect(runs).toHaveLength(1)
    const [mounted] = runs

    await provider.setLocale('fr')
    flushSync()

    expect(textOf('text')).toBe('Bonjour')
    expect(runs).toHaveLength(2)
    // Svelte's `t` keeps one identity and reads the new locale when called:
    // the fresh translation React's rebuilt function delivers is the same.
    expect(runs[1].t('greeting')).toBe('Bonjour')
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('runs the body once per addTranslations, keeping t and taking a new locales list', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { runs } = mountRecorder(provider)
    const [mounted] = runs

    provider.addTranslations('en', { greeting: 'Hi' })
    flushSync()

    expect(textOf('text')).toBe('Hi')
    expect(runs).toHaveLength(2)
    expect(runs[1].t).toBe(mounted.t)
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('keeps t and locales across a re-render with no provider change', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { runs, bump } = mountRecorder(provider)

    // A bump re-evaluates the component without notifying the provider, React's
    // ordinary re-render from a changed prop.
    bump.set(1)
    flushSync()

    expect(runs).toHaveLength(2)
    expect(runs[1].t).toBe(runs[0].t)
    expect(runs[1].locales).toBe(runs[0].locales)
  })
})
