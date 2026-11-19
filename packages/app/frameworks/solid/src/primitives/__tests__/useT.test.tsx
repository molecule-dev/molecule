// @vitest-environment jsdom
/**
 * The Solid counterparts of React's `useT.test.tsx`: one case per React test,
 * under the same title, asserting what a caller of the same primitive observes.
 *
 * Solid has no commits and no rerenders, so a React case is translated to the
 * framework-neutral fact it pins: the text read after a change is the changed
 * one, and a function returned by the hook is a stable reference that never
 * makes an effect re-run.
 *
 * @module
 */

import { createEffect, createSignal, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
 * Wraps a probe in the i18n context the primitives read.
 *
 * @param props - The provider the probe should see and the probe itself.
 * @returns The provider-wrapped probe.
 */
function Root(props: { provider: I18nProvider; children: JSX.Element }): JSX.Element {
  return <I18nContext.Provider value={props.provider}>{props.children}</I18nContext.Provider>
}

describe('useT', () => {
  it('re-renders on a locale change when the component uses only useT()', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe(): JSX.Element {
      const t = useT()
      return <span data-testid="text">{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
    }

    const { container } = mount(() => (
      <Root provider={provider}>
        <Probe />
      </Root>
    ))
    expect(textOf(container, 'text')).toBe('Hello')

    await provider.setLocale('fr')
    await settle()
    expect(textOf(container, 'text')).toBe('Bonjour')
  })

  it('re-renders when addTranslations adds keys for the active locale', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe(): JSX.Element {
      const t = useT()
      return <span data-testid="late">{t('lateKey', undefined, { defaultValue: 'Pending' })}</span>
    }

    const { container } = mount(() => (
      <Root provider={provider}>
        <Probe />
      </Root>
    ))
    expect(textOf(container, 'late')).toBe('Pending')

    provider.addTranslations('en', { lateKey: 'Loaded' })
    await settle()
    expect(textOf(container, 'late')).toBe('Loaded')
  })

  it('keeps the returned identity across re-renders AND locale changes', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const seen: UseTFunction[] = []
    const [count, setCount] = createSignal(0)
    function Probe(): JSX.Element {
      const t = useT()
      // Each run after a state change is Solid's stand-in for a rerender.
      createEffect(() => {
        count()
        seen.push(t)
      })
      return (
        <span data-testid="text">
          {t('greeting', undefined, { defaultValue: 'Hello' })} {count()}
        </span>
      )
    }

    const { container } = mount(() => (
      <Root provider={provider}>
        <Probe />
      </Root>
    ))
    await settle()
    const first = seen[seen.length - 1]
    setCount(1)
    await settle()
    expect(seen[seen.length - 1]).toBe(first)

    const runsBefore = seen.length
    await provider.setLocale('fr')
    await settle()
    // The text followed the locale, so the probe read it again; the function
    // itself kept one identity.
    setCount(2)
    await settle()
    expect(seen.length).toBeGreaterThan(runsBefore)
    expect(new Set(seen).size).toBe(1)
    expect(seen[seen.length - 1]).toBe(first)
    expect(textOf(container, 'text')).toContain('Bonjour')
  })

  it('does not re-run an effect that depends on the returned function', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const seen: UseTFunction[] = []
    let effectRuns = 0
    function Probe(): JSX.Element {
      const t = useT()
      createEffect(() => {
        // Reading the function is the dependency; it is not a signal, so the
        // effect must not re-run when the locale changes.
        seen.push(t)
        effectRuns += 1
      })
      return <span data-testid="text">{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
    }

    const { container } = mount(() => (
      <Root provider={provider}>
        <Probe />
      </Root>
    ))
    await settle()
    await provider.setLocale('fr')
    await settle()
    // The l63 failure class: a per-render identity re-ran this effect forever.
    expect(effectRuns).toBe(1)
    expect(new Set(seen).size).toBe(1)
    expect(textOf(container, 'text')).toBe('Bonjour')
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
    function Probe(): JSX.Element {
      const t = useT()
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
    expect(textOf(container, 'text')).toBe('Hello')

    // Solid reads a context once per owner, so the new provider reaches the
    // reader by remounting its block — the framework-forced form of React's
    // in-place replacement.
    setProvider(providerB)
    await settle()
    expect(unsubscribeA).toHaveBeenCalledTimes(1)
    expect(textOf(container, 'text')).toBe('Salut from B')

    providerB.addTranslations('en', { greeting: 'Salut encore' })
    await settle()
    expect(textOf(container, 'text')).toBe('Salut encore')
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
    function Probe(): JSX.Element {
      const t = useT()
      return <span>{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
    }

    const { dispose } = mount(() => (
      <Root provider={provider}>
        <Probe />
      </Root>
    ))
    await settle()
    dispose()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('preserves the existing values/defaultValue/count call shapes', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe(): JSX.Element {
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

    const { container } = mount(() => (
      <Root provider={provider}>
        <Probe />
      </Root>
    ))
    expect(textOf(container, 'values')).toBe('Welcome, Alice!')
    expect(textOf(container, 'default')).toBe('Fallback')
    expect(textOf(container, 'plural')).toBe('2 items')
    expect(textOf(container, 'count-fallback')).toBe('3 things')
  })

  it('accepts an inline fallback string as the second argument', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe(): JSX.Element {
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

    const { container } = mount(() => (
      <Root provider={provider}>
        <Probe />
      </Root>
    ))
    expect(textOf(container, 'fallback')).toBe('English fallback')
    expect(textOf(container, 'translated')).toBe('Hello')
    expect(textOf(container, 'interpolated')).toBe('3 items')
    expect(textOf(container, 'plural')).toBe('1 item')
  })
})

describe('useTranslation (control — existing behaviour)', () => {
  it('still re-renders on a locale change and translates', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    function Probe(): JSX.Element {
      const { t, locale } = useTranslation()
      return (
        <span data-testid="text">
          {locale()}:{t('greeting', undefined, { defaultValue: 'Hello' })}
        </span>
      )
    }

    const { container } = mount(() => (
      <Root provider={provider}>
        <Probe />
      </Root>
    ))
    expect(textOf(container, 'text')).toBe('en:Hello')

    await provider.setLocale('fr')
    await settle()
    expect(textOf(container, 'text')).toBe('fr:Bonjour')
  })
})
