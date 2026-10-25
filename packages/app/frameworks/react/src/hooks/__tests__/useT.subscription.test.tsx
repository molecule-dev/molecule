// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StrictMode, useEffect, useLayoutEffect, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { I18nContext } from '../../contexts.js'
import { useT, useTranslation } from '../useTranslation.js'

afterEach(cleanup)

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
  { code: 'ar', name: 'Arabic', direction: 'rtl', translations: { greeting: 'Marhaba' } },
]

/** Same element types on every render, so a new `provider` updates the tree in place. */
function Root({ provider, children }: { provider: I18nProvider; children: ReactNode }) {
  return <I18nContext.Provider value={provider}>{children}</I18nContext.Provider>
}

/** Counts the provider's live `onLocaleChange` subscriptions. */
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

/** Switches the locale from its mount effect, which runs before later siblings' and parents'. */
function SwitchOnMount({ provider, to }: { provider: I18nProvider; to: string }) {
  useEffect(() => {
    void provider.setLocale(to)
  }, [provider, to])
  return null
}

const LATE = { late: 'Loaded' }

/** Registers English translations from its mount effect. */
function AddOnMount({ provider }: { provider: I18nProvider }) {
  useEffect(() => {
    provider.addTranslations('en', LATE)
  }, [provider])
  return null
}

function Greeting() {
  const t = useT()
  return <span data-testid="text">{t('greeting', 'Hello')}</span>
}

describe('a notification fired before the hook subscribes', () => {
  it("useT: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    render(
      <Root provider={provider}>
        <SwitchOnMount provider={provider} to="fr" />
        <Greeting />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })

  it("useT: from a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Shell() {
      const t = useT()
      return (
        <>
          <span data-testid="title">{t('greeting', 'Hello')}</span>
          <SwitchOnMount provider={provider} to="fr" />
        </>
      )
    }
    render(
      <Root provider={provider}>
        <Shell />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('title').textContent).toBe('Bonjour')
  })

  it("useTranslation: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe() {
      const { t, locale, direction } = useTranslation()
      return (
        <span data-testid="text">
          {locale}/{direction}:{t('greeting', undefined, { defaultValue: 'Hello' })}
        </span>
      )
    }
    render(
      <Root provider={provider}>
        <SwitchOnMount provider={provider} to="ar" />
        <Probe />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('text').textContent).toBe('ar/rtl:Marhaba')
  })

  it("useT: translations added in a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Shell() {
      const t = useT()
      return (
        <>
          <span data-testid="title">{t('late', 'Pending')}</span>
          <AddOnMount provider={provider} />
        </>
      )
    }
    render(
      <Root provider={provider}>
        <Shell />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('title').textContent).toBe('Loaded')
  })

  it("useTranslation: translations added in an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe() {
      const { t } = useTranslation()
      return <span data-testid="text">{t('late', undefined, { defaultValue: 'Pending' })}</span>
    }
    render(
      <Root provider={provider}>
        <AddOnMount provider={provider} />
        <Probe />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('text').textContent).toBe('Loaded')
  })
})

describe('a provider replaced in place (no remount)', () => {
  it('useTranslation: no commit pairs the new provider with the old locale and direction', () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('ar', LOCALES)
    const commits: string[] = []
    let mounts = 0
    function Probe() {
      const { t, locale, direction } = useTranslation()
      const text = t('greeting', undefined, { defaultValue: 'Hello' })
      useEffect(() => {
        mounts += 1
      }, [])
      // Once per commit, before paint: what the user sees.
      useLayoutEffect(() => {
        commits.push(`${locale}/${direction}:${text}`)
      })
      return <span>{text}</span>
    }
    const { rerender } = render(
      <Root provider={providerA}>
        <Probe />
      </Root>,
    )
    rerender(
      <Root provider={providerB}>
        <Probe />
      </Root>,
    )
    expect(mounts).toBe(1)
    expect(commits).toEqual(['en/ltr:Hello', 'ar/rtl:Marhaba'])
  })

  it('useT: moves its subscription and changes its identity once', () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)
    const seen: unknown[] = []
    function Probe() {
      const t = useT()
      seen.push(t)
      return <span data-testid="text">{t('greeting', 'Hello')}</span>
    }
    const { rerender } = render(
      <Root provider={providerA}>
        <Probe />
      </Root>,
    )
    const first = seen[seen.length - 1]
    rerender(
      <Root provider={providerB}>
        <Probe />
      </Root>,
    )
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(seen[seen.length - 1]).not.toBe(first)
    act(() => {
      providerB.addTranslations('fr', { greeting: 'Salut' })
    })
    expect(screen.getByTestId('text').textContent).toBe('Salut')
  })
})

describe('subscription lifecycle', () => {
  it('useT: one live subscription under StrictMode, updates, none after unmount', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    const { unmount } = render(
      <StrictMode>
        <Root provider={provider}>
          <Greeting />
        </Root>
      </StrictMode>,
    )
    expect(live()).toBe(1)
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
    unmount()
    expect(live()).toBe(0)
  })
})

describe('translations the rendered text depends on', () => {
  it('useT: re-renders when English keys arrive while another locale is active', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Late() {
      const t = useT()
      return <span data-testid="late">{t('lateKey', 'Pending')}</span>
    }
    render(
      <Root provider={provider}>
        <Late />
      </Root>,
    )
    await act(async () => {
      await provider.setLocale('fr')
    })
    act(() => {
      provider.addTranslations('en', { lateKey: 'Loaded' })
    })
    // `t()` falls back to English for a key French lacks.
    expect(screen.getByTestId('late').textContent).toBe('Loaded')
  })

  it('re-registering the same translations while rendering does not loop', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function SelfRegistering() {
      const t = useT()
      provider.addTranslations('en', { own: 'Own text' })
      return <span data-testid="own">{t('own', 'Pending')}</span>
    }
    function Host() {
      const [tick, setTick] = useState(0)
      useEffect(() => {
        if (tick === 0) setTick(1)
      }, [tick])
      return <SelfRegistering />
    }
    render(
      <Root provider={provider}>
        <Host />
      </Root>,
    )
    expect(screen.getByTestId('own').textContent).toBe('Own text')
  })
})
