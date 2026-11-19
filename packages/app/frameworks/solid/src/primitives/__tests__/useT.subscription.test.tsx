// @vitest-environment jsdom
/**
 * The Solid counterparts of React's `useT.subscription.test.tsx`: one case per
 * React test, under the same title, asserting what a caller of the same
 * primitive observes.
 *
 * Solid has no commits, so a React case is translated to the framework-neutral
 * fact it pins: a notification fired before a reader existed (an earlier
 * sibling's or a child's mount effect) still shows in that reader's text, and a
 * replaced provider leaves no subscription behind.
 *
 * @module
 */

import { createEffect, createRenderEffect, createSignal, type JSX, onMount, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { I18nContext } from '../../context.js'
import { useT, useTranslation } from '../i18n.js'

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
  { code: 'ar', name: 'Arabic', direction: 'rtl', translations: { greeting: 'Marhaba' } },
]

/** Switches the locale from its mount effect. */
function SwitchOnMount(props: { provider: I18nProvider; to: string }): null {
  onMount(() => {
    void props.provider.setLocale(props.to)
  })
  return null
}

const LATE = { late: 'Loaded' }

/** Registers English translations from its mount effect. */
function AddOnMount(props: { provider: I18nProvider }): null {
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

describe('a notification fired before the hook subscribes', () => {
  it("useT: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { container } = mount(() => (
      <Root provider={provider}>
        <SwitchOnMount provider={provider} to="fr" />
        <Greeting />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'text')).toBe('Bonjour')
  })

  it("useT: from a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    /**
     * Renders the title and the switching child.
     *
     * @returns The shell.
     */
    function Shell(): JSX.Element {
      const t = useT()
      return (
        <>
          <span data-testid="title">{t('greeting', 'Hello')}</span>
          <SwitchOnMount provider={provider} to="fr" />
        </>
      )
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <Shell />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'title')).toBe('Bonjour')
  })

  it("useTranslation: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    /**
     * Renders the locale, direction and greeting together.
     *
     * @returns The probe.
     */
    function Probe(): JSX.Element {
      const { t, locale, direction } = useTranslation()
      return (
        <span data-testid="text">
          {locale()}/{direction()}:{t('greeting', undefined, { defaultValue: 'Hello' })}
        </span>
      )
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <SwitchOnMount provider={provider} to="ar" />
        <Probe />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'text')).toBe('ar/rtl:Marhaba')
  })

  it("useT: translations added in a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    /**
     * Renders the title and the registering child.
     *
     * @returns The shell.
     */
    function Shell(): JSX.Element {
      const t = useT()
      return (
        <>
          <span data-testid="title">{t('late', 'Pending')}</span>
          <AddOnMount provider={provider} />
        </>
      )
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <Shell />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'title')).toBe('Loaded')
  })

  it("useTranslation: translations added in an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    /**
     * Renders the late text.
     *
     * @returns The probe.
     */
    function Probe(): JSX.Element {
      const { t } = useTranslation()
      return <span data-testid="text">{t('late', undefined, { defaultValue: 'Pending' })}</span>
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <AddOnMount provider={provider} />
        <Probe />
      </Root>
    ))
    await settle()
    expect(textOf(container, 'text')).toBe('Loaded')
  })
})

describe('a provider replaced in place (no remount)', () => {
  it('useTranslation: no commit pairs the new provider with the old locale and direction', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('ar', LOCALES)
    const commits: string[] = []
    /**
     * Records the locale, direction and text it reads, once per render run.
     *
     * @returns The text.
     */
    function Probe(): JSX.Element {
      const { t, locale, direction } = useTranslation()
      // Solid's before-paint equivalent: what the user sees on each run.
      createRenderEffect(() => {
        commits.push(
          `${locale()}/${direction()}:${t('greeting', undefined, { defaultValue: 'Hello' })}`,
        )
      })
      return <span data-testid="text">{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
    }
    const [provider, setProvider] = createSignal<I18nProvider>(providerA)
    const { container } = mount(() => (
      <Show keyed when={provider()}>
        {(current) => (
          <Root provider={current}>
            <Probe />
          </Root>
        )}
      </Show>
    ))
    await settle()
    // Solid reads a context once per owner, so the replacement remounts the
    // block at the same position — its own locale and direction, never the
    // previous provider's paired with the new provider.
    setProvider(providerB)
    await settle()
    expect(commits).toEqual(['en/ltr:Hello', 'ar/rtl:Marhaba'])
    expect(textOf(container, 'text')).toBe('Marhaba')
  })

  it('useT: moves its subscription and changes its identity once', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)
    const seen: unknown[] = []
    /**
     * Renders the greeting and records the function it was handed.
     *
     * @returns The probe.
     */
    function Probe(): JSX.Element {
      const t = useT()
      seen.push(t)
      return <span data-testid="text">{t('greeting', 'Hello')}</span>
    }
    const [provider, setProvider] = createSignal<I18nProvider>(providerA)
    const { container } = mount(() => (
      <Show keyed when={provider()}>
        {(current) => (
          <Root provider={current}>
            <Probe />
          </Root>
        )}
      </Show>
    ))
    await settle()
    const first = seen[seen.length - 1]
    setProvider(providerB)
    await settle()
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(seen[seen.length - 1]).not.toBe(first)
    providerB.addTranslations('fr', { greeting: 'Salut' })
    await settle()
    expect(textOf(container, 'text')).toBe('Salut')
  })
})

describe('subscription lifecycle', () => {
  it('useT: one live subscription under StrictMode, updates, none after unmount', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    // Solid has no StrictMode double-invocation; a single owner gets exactly
    // one subscription and releases it when its owner is disposed.
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
})

describe('translations the rendered text depends on', () => {
  it('useT: re-renders when English keys arrive while another locale is active', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    /**
     * Renders a key only English registers.
     *
     * @returns The probe.
     */
    function Late(): JSX.Element {
      const t = useT()
      return <span data-testid="late">{t('lateKey', 'Pending')}</span>
    }
    const { container } = mount(() => (
      <Root provider={provider}>
        <Late />
      </Root>
    ))
    await provider.setLocale('fr')
    await settle()
    provider.addTranslations('en', { lateKey: 'Loaded' })
    await settle()
    // `t()` falls back to English for a key French lacks.
    expect(textOf(container, 'late')).toBe('Loaded')
  })

  it('re-registering the same translations while rendering does not loop', async () => {
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
    // A second registration of the same text changes nothing on screen, so it
    // must not notify (Solid's stand-in for React's second render).
    provider.addTranslations('en', { own: 'Own text' })
    await settle()
    expect(textOf(container, 'own')).toBe('Own text')
    expect(reads).toBeLessThanOrEqual(3)
  })
})
