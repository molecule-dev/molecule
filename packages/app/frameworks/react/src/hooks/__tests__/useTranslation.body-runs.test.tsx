// @vitest-environment jsdom
/**
 * How many times a component that calls `useTranslation()` runs its body when
 * the provider changes: once per locale switch and once per `addTranslations`,
 * with `t` following the locale and `locales` following every notification.
 *
 * @module
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { I18nContext } from '../../contexts.js'
import type { UseTranslationResult } from '../../types.js'
import { useTranslation } from '../useTranslation.js'

afterEach(cleanup)

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
]

/**
 * Mounts a component that records every body run and every hook result.
 *
 * @param provider - The i18n provider to read.
 * @returns The recorded body runs.
 */
function mountRecorder(provider: I18nProvider): UseTranslationResult[] {
  const runs: UseTranslationResult[] = []
  /**
   * Records one body run.
   *
   * @returns The greeting.
   */
  function Greeting(): string {
    const result = useTranslation()
    runs.push(result)
    return result.t('greeting')
  }
  render(
    <I18nContext.Provider value={provider}>
      <Greeting />
    </I18nContext.Provider>,
  )
  return runs
}

describe('useTranslation body runs', () => {
  it('runs the body once per locale switch, with a new t and a new locales list', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const runs = mountRecorder(provider)
    expect(runs).toHaveLength(1)
    const [mounted] = runs

    await act(async () => {
      await provider.setLocale('fr')
    })

    expect(screen.getByText('Bonjour')).toBeDefined()
    expect(runs).toHaveLength(2)
    expect(runs[1].t).not.toBe(mounted.t)
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('runs the body once per addTranslations, keeping t and taking a new locales list', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const runs = mountRecorder(provider)
    const [mounted] = runs

    act(() => {
      provider.addTranslations('en', { greeting: 'Hi' })
    })

    expect(screen.getByText('Hi')).toBeDefined()
    expect(runs).toHaveLength(2)
    expect(runs[1].t).toBe(mounted.t)
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('keeps t and locales across a re-render with no provider change', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const runs: UseTranslationResult[] = []
    /**
     * Records one body run.
     *
     * @param props - The props.
     * @param props.count - A prop that changes to force a re-render.
     * @returns The greeting and the count.
     */
    function Greeting({ count }: { count: number }): string {
      const result = useTranslation()
      runs.push(result)
      return `${result.t('greeting')} ${count}`
    }
    const { rerender } = render(
      <I18nContext.Provider value={provider}>
        <Greeting count={1} />
      </I18nContext.Provider>,
    )
    rerender(
      <I18nContext.Provider value={provider}>
        <Greeting count={2} />
      </I18nContext.Provider>,
    )

    expect(runs).toHaveLength(2)
    expect(runs[1].t).toBe(runs[0].t)
    expect(runs[1].locales).toBe(runs[0].locales)
  })
})
