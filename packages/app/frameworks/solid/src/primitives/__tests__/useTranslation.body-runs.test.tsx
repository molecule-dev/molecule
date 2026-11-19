// @vitest-environment jsdom
/**
 * The Solid counterparts of React's `useTranslation.body-runs.test.tsx`.
 *
 * Solid has no component rerenders: a component's body runs once and the
 * reactive expressions in its JSX re-run instead. So a React "body run" is
 * recorded from a `createEffect` that reads the hook's result — it runs once
 * at mount and once per provider notification, which is the same fact React's
 * instrumented body count pins: how often the provider makes a reader re-read.
 *
 * @module
 */

import { createEffect, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { I18nContext } from '../../context.js'
import { useTranslation, type UseTranslationResult } from '../i18n.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a Solid tree into a container in the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
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

/** What one recorded read of the hook's result observed. */
interface RecordedRun {
  /** The translation function the result exposed at that run. */
  t: I18nProvider['t']
  /** The locale list the result exposed at that run. */
  locales: ReturnType<I18nProvider['getLocales']>
  /** The greeting the run translated. */
  text: string
}

/**
 * Reads the hook's result once: its `t`, its `locales` and one translation.
 *
 * @param result - The hook's result.
 * @returns What this read observed.
 */
function record(result: UseTranslationResult): RecordedRun {
  return { t: result.t, locales: result.locales(), text: result.t('greeting') }
}

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
]

/**
 * Mounts a component that records every run of its reactive read.
 *
 * @param provider - The i18n provider to read.
 * @returns The recorded runs.
 */
function mountRecorder(provider: I18nProvider): RecordedRun[] {
  const runs: RecordedRun[] = []
  /**
   * Records one run.
   *
   * @returns The greeting.
   */
  function Greeting(): JSX.Element {
    const result = useTranslation()
    createEffect(() => {
      runs.push(record(result))
    })
    return <span>{result.t('greeting')}</span>
  }
  mount(() => (
    <I18nContext.Provider value={provider}>
      <Greeting />
    </I18nContext.Provider>
  ))
  return runs
}

describe('useTranslation body runs', () => {
  it('runs the body once per locale switch, with a new t and a new locales list', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const runs = mountRecorder(provider)
    await settle()
    expect(runs).toHaveLength(1)
    const [mounted] = runs

    await provider.setLocale('fr')
    await settle()

    expect(runs).toHaveLength(2)
    expect(runs[1].text).toBe('Bonjour')
    expect(runs[1].t).not.toBe(mounted.t)
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('runs the body once per addTranslations, keeping t and taking a new locales list', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const runs = mountRecorder(provider)
    await settle()
    const [mounted] = runs

    provider.addTranslations('en', { greeting: 'Hi' })
    await settle()

    expect(runs).toHaveLength(2)
    expect(runs[1].text).toBe('Hi')
    expect(runs[1].t).toBe(mounted.t)
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('keeps t and locales across a re-render with no provider change', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const runs: RecordedRun[] = []
    const [count, setCount] = createSignal(1)
    let result!: UseTranslationResult
    /**
     * Records one reactive read.
     *
     * @returns The greeting and the count.
     */
    function Greeting(): JSX.Element {
      result = useTranslation()
      createEffect(() => {
        runs.push(record(result))
      })
      return (
        <span>
          {result.t('greeting')} {count()}
        </span>
      )
    }
    mount(() => (
      <I18nContext.Provider value={provider}>
        <Greeting />
      </I18nContext.Provider>
    ))
    await settle()
    const [mounted] = runs
    expect(runs).toHaveLength(1)

    // A state change re-evaluates the rendered expression, Solid's stand-in
    // for React's rerender, without any provider notification.
    setCount(2)
    await settle()

    expect(runs).toHaveLength(1)
    const reread = record(result)
    expect(reread.t).toBe(mounted.t)
    expect(reread.locales).toBe(mounted.locales)
  })
})
