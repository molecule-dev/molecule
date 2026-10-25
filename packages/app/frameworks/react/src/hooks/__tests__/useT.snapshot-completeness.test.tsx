// @vitest-environment jsdom
/**
 * A change announced while the hook cannot yet hear it must still be observed.
 *
 * The listener a hook attaches starts in the layout phase, so a notification
 * fired before that — from a child's or an earlier sibling's layout effect, or
 * while React keeps the tree hidden with its effects unmounted — never reaches
 * it. These tests require the text to update anyway: the provider's revision is
 * part of the store snapshot, so `useSyncExternalStore` sees the change when it
 * subscribes (or re-subscribes) and re-renders.
 *
 * On the accepted P20 tree every case under the first three describes fails;
 * after this repair they pass. The remaining describes are controls that must
 * pass on both. The hidden-Activity probes read through a `memo` component on
 * purpose: a parent re-render cannot mask the missing notification, so the text
 * can only change through the store subscription.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Activity, memo, StrictMode, useEffect, useLayoutEffect, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { I18nContext } from '../../contexts.js'
import { useT, useTranslation } from '../useTranslation.js'

afterEach(cleanup)

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
]

const LATE = { late: 'Loaded' }

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

/** Registers translations from its LAYOUT effect: it runs before its parent's. */
function AddInLayout({ provider }: { provider: I18nProvider }) {
  useLayoutEffect(() => {
    provider.addTranslations('en', LATE)
  }, [provider])
  return null
}

/** Switches the locale from its LAYOUT effect. */
function SwitchInLayout({ provider, to }: { provider: I18nProvider; to: string }) {
  useLayoutEffect(() => {
    void provider.setLocale(to)
  }, [provider, to])
  return null
}

/** Registers translations from its mount (passive) effect, which runs after every layout. */
function AddInEffect({ provider }: { provider: I18nProvider }) {
  useEffect(() => {
    provider.addTranslations('en', LATE)
  }, [provider])
  return null
}

function Greeting() {
  const t = useT()
  return <span data-testid="text">{t('greeting', 'Hello')}</span>
}

function LateText() {
  const t = useT()
  return <span data-testid="late">{t('late', 'Pending')}</span>
}

function Detail() {
  const { t, locale, direction } = useTranslation()
  const text = `${locale}/${direction}:${t('greeting', undefined, {
    defaultValue: 'Hello',
  })}|${t('late', undefined, { defaultValue: 'Pending' })}`
  return <span data-testid="detail">{text}</span>
}

/**
 * A prop-independent reader. A parent re-render bails out here, so the hidden
 * probes can only show new text through the store subscription.
 */
const MemoDetail = memo(Detail)

describe("a same-locale add in a child's layout effect", () => {
  it('useT: the parent renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Shell() {
      const t = useT()
      return (
        <>
          <span data-testid="shell">{t('late', 'Pending')}</span>
          <AddInLayout provider={provider} />
        </>
      )
    }
    render(
      <Root provider={provider}>
        <Shell />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('shell').textContent).toBe('Loaded')
  })

  it('useTranslation: the parent renders the added text with the current locale/direction', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Shell() {
      const { t, locale, direction } = useTranslation()
      return (
        <>
          <span data-testid="shell">
            {locale}/{direction}:{t('late', undefined, { defaultValue: 'Pending' })}
          </span>
          <AddInLayout provider={provider} />
        </>
      )
    }
    render(
      <Root provider={provider}>
        <Shell />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('shell').textContent).toBe('en/ltr:Loaded')
  })
})

describe("a same-locale add in an earlier sibling's layout effect", () => {
  it('useT: the later sibling renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    render(
      <Root provider={provider}>
        <AddInLayout provider={provider} />
        <LateText />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('late').textContent).toBe('Loaded')
  })

  it('useTranslation: the later sibling renders text and locale together', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    render(
      <Root provider={provider}>
        <AddInLayout provider={provider} />
        <Detail />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('detail').textContent).toBe('en/ltr:Hello|Loaded')
  })
})

describe('a same-locale change while React Activity is hidden', () => {
  it('useT: effects are unmounted while hidden and the text updates on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    function Scene({ mode }: { mode: 'visible' | 'hidden' }) {
      return (
        <Activity mode={mode}>
          <MemoDetail />
        </Activity>
      )
    }
    const { rerender } = render(
      <Root provider={provider}>
        <Scene mode="visible" />
      </Root>,
    )
    expect(screen.getByTestId('detail').textContent).toBe('en/ltr:Hello|Pending')
    expect(live()).toBe(1)
    rerender(
      <Root provider={provider}>
        <Scene mode="hidden" />
      </Root>,
    )
    // The premise of the case: hidden Activity unmounts effects, so no listener exists.
    expect(live()).toBe(0)
    act(() => {
      provider.addTranslations('en', LATE)
    })
    rerender(
      <Root provider={provider}>
        <Scene mode="visible" />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('detail').textContent).toBe('en/ltr:Hello|Loaded')
  })

  it('useTranslation: a locale switch while hidden is shown on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Scene({ mode }: { mode: 'visible' | 'hidden' }) {
      return (
        <Activity mode={mode}>
          <MemoDetail />
        </Activity>
      )
    }
    const { rerender } = render(
      <Root provider={provider}>
        <Scene mode="visible" />
      </Root>,
    )
    rerender(
      <Root provider={provider}>
        <Scene mode="hidden" />
      </Root>,
    )
    await act(async () => {
      await provider.setLocale('fr')
    })
    rerender(
      <Root provider={provider}>
        <Scene mode="visible" />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('detail').textContent).toBe('fr/ltr:Bonjour|Pending')
  })
})

describe('a locale switch before the listener exists (already caught by the locale in the snapshot)', () => {
  it("useT: a child's layout-effect switch is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Shell() {
      const t = useT()
      return (
        <>
          <span data-testid="shell">{t('greeting', 'Hello')}</span>
          <SwitchInLayout provider={provider} to="fr" />
        </>
      )
    }
    render(
      <Root provider={provider}>
        <Shell />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('shell').textContent).toBe('Bonjour')
  })
})

describe('ordinary effects and notifications stay green', () => {
  it("useT: an add from the reader's own mount effect is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Shell() {
      const t = useT()
      return (
        <>
          <span data-testid="shell">{t('late', 'Pending')}</span>
          <AddInEffect provider={provider} />
        </>
      )
    }
    render(
      <Root provider={provider}>
        <Shell />
      </Root>,
    )
    await act(async () => {})
    expect(screen.getByTestId('shell').textContent).toBe('Loaded')
  })

  it('useT: a later add while mounted re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    render(
      <Root provider={provider}>
        <LateText />
      </Root>,
    )
    act(() => {
      provider.addTranslations('en', LATE)
    })
    expect(screen.getByTestId('late').textContent).toBe('Loaded')
  })

  it('useT: an English fallback added while French is active re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    render(
      <Root provider={provider}>
        <LateText />
      </Root>,
    )
    await act(async () => {
      await provider.setLocale('fr')
    })
    act(() => {
      provider.addTranslations('en', LATE)
    })
    expect(screen.getByTestId('late').textContent).toBe('Loaded')
  })

  it('useT: an unchanged re-registration while rendering does not loop', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    let renders = 0
    function SelfRegistering() {
      const t = useT()
      renders += 1
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
    expect(renders).toBeLessThanOrEqual(3)
  })
})

describe('identity, lifecycle and provider replacement accepted fixes are preserved', () => {
  it('useT: one callback identity across re-renders and a locale change, one effect run', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const seen: unknown[] = []
    let effectRuns = 0
    function Probe() {
      const t = useT()
      seen.push(t)
      useEffect(() => {
        effectRuns += 1
      }, [t])
      return <span data-testid="text">{t('greeting', 'Hello')}</span>
    }
    render(
      <Root provider={provider}>
        <Probe />
      </Root>,
    )
    const first = seen[0]
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(new Set(seen).size).toBe(1)
    expect(seen[0]).toBe(first)
    expect(effectRuns).toBe(1)
    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
  })

  it('useT: one live subscription under StrictMode and none after unmount', async () => {
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

  it('useT: replacing the provider in place moves the subscription and updates text', () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)
    const { rerender } = render(
      <Root provider={providerA}>
        <Greeting />
      </Root>,
    )
    rerender(
      <Root provider={providerB}>
        <Greeting />
      </Root>,
    )
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(screen.getByTestId('text').textContent).toBe('Bonjour')
    act(() => {
      providerB.addTranslations('fr', { greeting: 'Salut' })
    })
    expect(screen.getByTestId('text').textContent).toBe('Salut')
  })

  it('useT: a provider without getRevision still re-renders on ordinary notifications', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    // A provider written before the revision method existed: the hook must fall
    // back to counting notifications, exactly as it did on the accepted tree.
    delete (provider as I18nProvider & { getRevision?: () => number }).getRevision
    render(
      <Root provider={provider}>
        <LateText />
      </Root>,
    )
    act(() => {
      provider.addTranslations('en', LATE)
    })
    expect(screen.getByTestId('late').textContent).toBe('Loaded')
  })
})
