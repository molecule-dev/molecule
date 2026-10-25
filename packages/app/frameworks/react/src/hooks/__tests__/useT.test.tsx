// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { I18nContext } from '../../contexts.js'
import type { UseTFunction } from '../../types.js'
import { useT, useTranslation } from '../useTranslation.js'

// Keep each test's rendered tree isolated even when the runner does not expose
// React Testing Library's global auto-cleanup hook.
afterEach(cleanup)

/**
 * Locales used by every probe. `greeting` exists in both so a locale switch is
 * observable; `welcome`/`item_*` cover the existing values/count call shapes.
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

/**
 * Wraps a probe in the i18n context the hooks read.
 *
 * @param provider - Provider the probe should see.
 * @returns A wrapper component for `render`.
 */
const wrapperFor =
  (provider: I18nProvider) =>
  ({ children }: { children: ReactNode }) => (
    <I18nContext.Provider value={provider}>{children}</I18nContext.Provider>
  )

describe('useT', () => {
  it('re-renders on a locale change when the component uses only useT()', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe() {
      const t = useT()
      return <span data-testid="text">{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
    }

    render(<Probe />, { wrapper: wrapperFor(provider) })
    expect(screen.getByTestId('text').textContent).toBe('Hello')

    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })

  it('re-renders when addTranslations adds keys for the active locale', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe() {
      const t = useT()
      return <span data-testid="late">{t('lateKey', undefined, { defaultValue: 'Pending' })}</span>
    }

    render(<Probe />, { wrapper: wrapperFor(provider) })
    expect(screen.getByTestId('late').textContent).toBe('Pending')

    act(() => {
      provider.addTranslations('en', { lateKey: 'Loaded' })
    })
    expect(screen.getByTestId('late').textContent).toBe('Loaded')
  })

  it('keeps the returned identity across re-renders AND locale changes', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const seen: UseTFunction[] = []
    function Probe() {
      const t = useT()
      seen.push(t)
      return <span data-testid="text">{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
    }

    const { rerender } = render(<Probe />, { wrapper: wrapperFor(provider) })
    const first = seen[seen.length - 1]
    rerender(<Probe />)
    expect(seen[seen.length - 1]).toBe(first)

    const rendersBefore = seen.length
    await act(async () => {
      await provider.setLocale('fr')
    })
    // The hook re-rendered (so text is fresh) AND the function identity survived.
    expect(seen.length).toBeGreaterThan(rendersBefore)
    expect(seen[seen.length - 1]).toBe(first)
    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })

  it('does not re-run an effect that depends on the returned function', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    let effectRuns = 0
    function Probe() {
      const t = useT()
      useEffect(() => {
        effectRuns += 1
      }, [t])
      return <span data-testid="text">{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
    }

    const { rerender } = render(<Probe />, { wrapper: wrapperFor(provider) })
    rerender(<Probe />)
    await act(async () => {
      await provider.setLocale('fr')
    })
    // The l63 failure class: a per-render identity re-ran this effect forever.
    expect(effectRuns).toBe(1)
    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })

  it('moves the subscription when the provider instance is replaced', () => {
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
    function Probe() {
      const t = useT()
      return <span data-testid="text">{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
    }

    const { rerender } = render(<Probe />, { wrapper: wrapperFor(providerA) })
    expect(screen.getByTestId('text').textContent).toBe('Hello')

    rerender(
      <I18nContext.Provider value={providerB}>
        <Probe />
      </I18nContext.Provider>,
    )
    expect(unsubscribeA).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('text').textContent).toBe('Salut from B')

    act(() => {
      providerB.addTranslations('en', { greeting: 'Salut encore' })
    })
    expect(screen.getByTestId('text').textContent).toBe('Salut encore')
  })

  it('unsubscribes when the component unmounts', () => {
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
    function Probe() {
      const t = useT()
      return <span>{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
    }

    const { unmount } = render(<Probe />, { wrapper: wrapperFor(provider) })
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('preserves the existing values/defaultValue/count call shapes', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe() {
      const t = useT()
      return (
        <>
          <span data-testid="values">{t('welcome', { name: 'Alice' })}</span>
          <span data-testid="default">
            {t('missing.key', undefined, { defaultValue: 'Fallback' })}
          </span>
          <span data-testid="plural">{t('item', { count: 2 }, { count: 2 })}</span>
          <span data-testid="count-fallback">
            {t('missing.item', undefined, { defaultValue: '{{count}} things', count: 3 })}
          </span>
        </>
      )
    }

    render(<Probe />, { wrapper: wrapperFor(provider) })
    expect(screen.getByTestId('values').textContent).toBe('Welcome, Alice!')
    expect(screen.getByTestId('default').textContent).toBe('Fallback')
    expect(screen.getByTestId('plural').textContent).toBe('2 items')
    expect(screen.getByTestId('count-fallback').textContent).toBe('3 things')
  })

  it('accepts an inline fallback string as the second argument', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe() {
      const t = useT()
      return (
        <>
          <span data-testid="fallback">{t('missing.key', 'English fallback')}</span>
          <span data-testid="translated">{t('greeting', 'English fallback')}</span>
          <span data-testid="interpolated">
            {t('missing.template', '{{count}} items', { count: 3 })}
          </span>
          <span data-testid="plural">{t('item', '{{count}} things', { count: 1 })}</span>
        </>
      )
    }

    render(<Probe />, { wrapper: wrapperFor(provider) })
    expect(screen.getByTestId('fallback').textContent).toBe('English fallback')
    expect(screen.getByTestId('translated').textContent).toBe('Hello')
    expect(screen.getByTestId('interpolated').textContent).toBe('3 items')
    expect(screen.getByTestId('plural').textContent).toBe('1 item')
  })
})

describe('useTranslation (control — existing behaviour)', () => {
  it('still re-renders on a locale change and translates', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe() {
      const { t, locale } = useTranslation()
      return (
        <span data-testid="text">
          {locale}:{t('greeting', undefined, { defaultValue: 'Hello' })}
        </span>
      )
    }

    render(<Probe />, { wrapper: wrapperFor(provider) })
    expect(screen.getByTestId('text').textContent).toBe('en:Hello')

    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(screen.getByTestId('text').textContent).toBe('fr:Bonjour')
  })
})
