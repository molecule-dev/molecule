// @vitest-environment jsdom
/**
 * The Solid counterparts of React's `useT.snapshot-completeness.test.tsx`: one
 * case per React test, under the same title, asserting what a caller of the
 * same primitive observes.
 *
 * A change announced while React could not yet hear it must still be observed.
 * Solid has no separate subscribe phase — `useT`/`useTranslation` subscribe
 * while their owner is set up, before any mount effect runs — so an add or a
 * switch fired from a child's or an earlier sibling's effect is counted. What
 * Solid does have is a hidden-subtree equivalent: `<Show when={false}>`
 * disposes its owner, so the reader's subscription is gone and the text must be
 * current when it is revealed again.
 *
 * @module
 */

import { createEffect, createRenderEffect, createSignal, type JSX, onMount, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { I18nContext } from '../../context.js'
import { useT, type UseTFunction, useTranslation } from '../i18n.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a Solid tree into a container in the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container and the disposer that removes the tree.
 */
function mount(app: () => JSX.Element): { container: HTMLElement; dispose: () => void } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const disposeRoot = render(app, container)
  const dispose = (): void => {
    disposeRoot()
    container.remove()
  }
  disposers.push(dispose)
  return { container, dispose }
}

/**
 * Lets Solid's update queue flush before an assertion reads the DOM.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Reads a probe's text.
 *
 * @param container - The mounted tree's container.
 * @param testId - The probe's `data-testid`.
 * @returns The element's text content.
 */
function textOf(container: HTMLElement, testId: string): string | null | undefined {
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent
}

/**
 * Wraps a probe in the i18n context the primitives read.
 *
 * @param props - The provider the probe should see and the probe itself.
 * @returns The provider-wrapped probe.
 */
function Root(props: { provider: I18nProvider; children: JSX.Element }): JSX.Element {
  return <I18nContext.Provider value={props.provider}>{props.children}</I18nContext.Provider>
}

/**
 * Counts the provider's live `onLocaleChange` subscriptions.
 *
 * @param provider - The provider to wrap.
 * @returns An accessor for the number of live subscriptions.
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

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
]

const LATE = { late: 'Loaded' }

/** Registers translations as early as the framework allows: before its render. */
function AddInLayout(props: { provider: I18nProvider }): null {
  createRenderEffect(() => {
    props.provider.addTranslations('en', LATE)
  })
  return null
}

/** Switches the locale as early as the framework allows. */
function SwitchInLayout(props: { provider: I18nProvider; to: string }): null {
  createRenderEffect(() => {
    void props.provider.setLocale(props.to)
  })
  return null
}

/** Registers translations from its mount effect. */
function AddInEffect(props: { provider: I18nProvider }): null {
  onMount(() => {
    props.provider.addTranslations('en', LATE)
  })
  return null
}

/**
 * Renders the greeting through `useT()`.
 *
 * @returns The greeting probe.
 */
function Greeting(): JSX.Element {
  const t = useT()
  return <span data-testid="text">{t('greeting', 'Hello')}</span>
}

/**
 * Renders a late key through `useT()`.
 *
 * @returns The late-text probe.
 */
function LateText(): JSX.Element {
  const t = useT()
  return <span data-testid="late">{t('late', 'Pending')}</span>
}

/**
 * Renders locale, direction, greeting and late text together.
 *
 * @returns The detail probe.
 */
function Detail(): JSX.Element {
  const { t, locale, direction } = useTranslation()
  const text = `${locale()}/${direction()}:${t('greeting', undefined, {
    defaultValue: 'Hello',
  })}|${t('late', undefined, { defaultValue: 'Pending' })}`
  return <span data-testid="detail">{text}</span>
}

describe("a same-locale add in a child's layout effect", () => {
  it('useT: the parent renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    /**
     * Renders the shell and the registering child.
     *
     * @returns The shell.
     */
    function Shell(): JSX.Element {
      const t = useT()
      return (
        <>
          <span data-testid="shell">{t('late', 'Pending')}</span>
          <AddInLayout provider={provider} />
        </>
      )
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <Shell />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'shell')).toBe('Loaded')
  })

  it('useTranslation: the parent renders the added text with the current locale/direction', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    /**
     * Renders the locale, direction and late text, plus the registering child.
     *
     * @returns The shell.
     */
    function Shell(): JSX.Element {
      const { t, locale, direction } = useTranslation()
      return (
        <>
          <span data-testid="shell">
            {locale()}/{direction()}:{t('late', undefined, { defaultValue: 'Pending' })}
          </span>
          <AddInLayout provider={provider} />
        </>
      )
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <Shell />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'shell')).toBe('en/ltr:Loaded')
  })
})

describe("a same-locale add in an earlier sibling's layout effect", () => {
  it('useT: the later sibling renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { container } = mount(() => (
      <Root provider={provider}>
        <AddInLayout provider={provider} />
        <LateText />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'late')).toBe('Loaded')
  })

  it('useTranslation: the later sibling renders text and locale together', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { container } = mount(() => (
      <Root provider={provider}>
        <AddInLayout provider={provider} />
        <Detail />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'detail')).toBe('en/ltr:Hello|Loaded')
  })
})

describe('a same-locale change while React Activity is hidden', () => {
  it('useT: effects are unmounted while hidden and the text updates on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    // Solid's false <Show> disposes the subtree: the same "effects unmounted
    // while hidden" premise as React's hidden Activity.
    const [visible, setVisible] = createSignal(true)
    const { container } = mount(() => (
      <Root provider={provider}>
        <Show when={visible()}>
          <Detail />
        </Show>
      </Root>
    ))
    await settle()
    expect(textOf(container, 'detail')).toBe('en/ltr:Hello|Pending')
    expect(live()).toBe(1)
    setVisible(false)
    await settle()
    // The premise of the case: hidden content has no listener at all.
    expect(live()).toBe(0)
    provider.addTranslations('en', LATE)
    setVisible(true)
    await settle()
    expect(textOf(container, 'detail')).toBe('en/ltr:Hello|Loaded')
  })

  it('useTranslation: a locale switch while hidden is shown on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const [visible, setVisible] = createSignal(true)
    const { container } = mount(() => (
      <Root provider={provider}>
        <Show when={visible()}>
          <Detail />
        </Show>
      </Root>
    ))
    await settle()
    setVisible(false)
    await settle()
    await provider.setLocale('fr')
    setVisible(true)
    await settle()
    expect(textOf(container, 'detail')).toBe('fr/ltr:Bonjour|Pending')
  })
})

describe('a locale switch before the listener exists (already caught by the locale in the snapshot)', () => {
  it("useT: a child's layout-effect switch is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    /**
     * Renders the greeting and the switching child.
     *
     * @returns The shell.
     */
    function Shell(): JSX.Element {
      const t = useT()
      return (
        <>
          <span data-testid="shell">{t('greeting', 'Hello')}</span>
          <SwitchInLayout provider={provider} to="fr" />
        </>
      )
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <Shell />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'shell')).toBe('Bonjour')
  })
})

describe('ordinary effects and notifications stay green', () => {
  it("useT: an add from the reader's own mount effect is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    /**
     * Renders the late text and registers it from a mount effect.
     *
     * @returns The shell.
     */
    function Shell(): JSX.Element {
      const t = useT()
      return (
        <>
          <span data-testid="shell">{t('late', 'Pending')}</span>
          <AddInEffect provider={provider} />
        </>
      )
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <Shell />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'shell')).toBe('Loaded')
  })

  it('useT: a later add while mounted re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { container } = mount(() => (
      <Root provider={provider}>
        <LateText />
      </Root>
    ))
    provider.addTranslations('en', LATE)
    await settle()
    expect(textOf(container, 'late')).toBe('Loaded')
  })

  it('useT: an English fallback added while French is active re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { container } = mount(() => (
      <Root provider={provider}>
        <LateText />
      </Root>
    ))
    await provider.setLocale('fr')
    await settle()
    provider.addTranslations('en', LATE)
    await settle()
    expect(textOf(container, 'late')).toBe('Loaded')
  })

  it('useT: an unchanged re-registration while rendering does not loop', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    let reads = 0
    /**
     * Registers its own translations while setting up, then reads them.
     *
     * @returns The probe.
     */
    function SelfRegistering(): JSX.Element {
      const t = useT()
      provider.addTranslations('en', { own: 'Own text' })
      createEffect(() => {
        reads += 1
        t('own', 'Pending')
      })
      return <span data-testid="own">{t('own', 'Pending')}</span>
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <SelfRegistering />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'own')).toBe('Own text')
    // A second registration of the same text changes nothing on screen, so a
    // notification would loop forever; none may be sent.
    provider.addTranslations('en', { own: 'Own text' })
    await settle()
    expect(textOf(container, 'own')).toBe('Own text')
    expect(reads).toBeLessThanOrEqual(3)
  })
})

describe('identity, lifecycle and provider replacement accepted fixes are preserved', () => {
  it('useT: one callback identity across re-renders and a locale change, one effect run', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const seen: UseTFunction[] = []
    let effectRuns = 0
    /**
     * Renders the greeting and records the function an effect depends on.
     *
     * @returns The probe.
     */
    function Probe(): JSX.Element {
      const t = useT()
      createEffect(() => {
        // Reading the function is the dependency: it is not a signal, so the
        // effect must run once across the switch.
        seen.push(t)
        effectRuns += 1
      })
      return <span data-testid="text">{t('greeting', 'Hello')}</span>
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <Probe />
      </Root>
    ))
    await settle()
    const first = seen[0]
    await provider.setLocale('fr')
    await settle()
    expect(new Set(seen).size).toBe(1)
    expect(seen[0]).toBe(first)
    expect(effectRuns).toBe(1)
    expect(textOf(container, 'text')).toBe('Bonjour')
  })

  it('useT: one live subscription under StrictMode and none after unmount', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    // Solid has no StrictMode double-invocation; a single owner gets exactly
    // one subscription and releases it when it is disposed.
    const { container, dispose } = mount(() => (
      <Root provider={provider}>
        <Greeting />
      </Root>
    ))
    await settle()
    expect(live()).toBe(1)
    await provider.setLocale('fr')
    await settle()
    expect(textOf(container, 'text')).toBe('Bonjour')
    dispose()
    expect(live()).toBe(0)
  })

  it('useT: replacing the provider in place moves the subscription and updates text', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)
    const [provider, setProvider] = createSignal<I18nProvider>(providerA)
    const { container } = mount(() => (
      <Show keyed when={provider()}>
        {(current) => (
          <Root provider={current}>
            <Greeting />
          </Root>
        )}
      </Show>
    ))
    await settle()
    // Solid reads a context once per owner, so the replacement remounts the
    // block — the framework-forced form of React's in-place replacement.
    setProvider(providerB)
    await settle()
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(textOf(container, 'text')).toBe('Bonjour')
    providerB.addTranslations('fr', { greeting: 'Salut' })
    await settle()
    expect(textOf(container, 'text')).toBe('Salut')
  })

  it('useT: a provider without getRevision still re-renders on ordinary notifications', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    // A provider written before the revision method existed: the hook must
    // still follow ordinary notifications, exactly as it did on the accepted
    // tree.
    const { getRevision, ...withoutRevision } = provider
    expect(getRevision).toBeTypeOf('function')
    const legacyProvider: I18nProvider = withoutRevision
    const { container } = mount(() => (
      <Root provider={legacyProvider}>
        <LateText />
      </Root>
    ))
    legacyProvider.addTranslations('en', LATE)
    await settle()
    expect(textOf(container, 'late')).toBe('Loaded')
  })
})
