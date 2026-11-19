// @vitest-environment jsdom
/**
 * How many times a component that calls `useTranslation()` renders when the
 * provider changes: once per locale switch and once per `addTranslations`,
 * with `t` following the locale and `locales` following every notification.
 *
 * Ports `useTranslation.body-runs.test.tsx` from `@molecule/app-react`. A
 * composable's returned `t` is one stable function for the component instance
 * (React hands back a new one per locale switch so memoized text refreshes);
 * what a caller observes — fresh text through that function and a new
 * `locales` list per notification — is ported instead.
 *
 * @module
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { type Component, defineComponent, h, nextTick, ref } from 'vue'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { moleculePlugin } from '../../plugin.js'
import { useTranslation } from '../useTranslation.js'

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
]

/** One render of the probe: the composable's `t`, its `locales` list, and the text it rendered. */
interface Run {
  t: I18nProvider['t']
  locales: ReturnType<I18nProvider['getLocales']>
  text: string
}

const wrappers: VueWrapper[] = []

const mountWith = (provider: I18nProvider, component: Component): VueWrapper => {
  const wrapper = mount(component, {
    global: { plugins: [[moleculePlugin, { i18n: provider }]] },
  })
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Mounts a component that records every render and the composable's result.
 *
 * @param provider - The i18n provider to read.
 * @returns The recorded renders.
 */
function mountRecorder(provider: I18nProvider): Run[] {
  const runs: Run[] = []
  const Greeting = defineComponent({
    setup() {
      const result = useTranslation()
      return () => {
        const text = result.t('greeting')
        runs.push({ t: result.t, locales: result.locales.value, text })
        return h('span', text)
      }
    },
  })
  mountWith(provider, Greeting)
  return runs
}

describe('useTranslation body runs', () => {
  it('runs the body once per locale switch, with a new t and a new locales list', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const runs = mountRecorder(provider)
    await nextTick()
    expect(runs).toHaveLength(1)
    const [mounted] = runs

    await provider.setLocale('fr')
    await nextTick()

    expect(runs[runs.length - 1].text).toBe('Bonjour')
    expect(runs).toHaveLength(2)
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('runs the body once per addTranslations, keeping t and taking a new locales list', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const runs = mountRecorder(provider)
    await nextTick()
    const [mounted] = runs

    provider.addTranslations('en', { greeting: 'Hi' })
    await nextTick()

    expect(runs[runs.length - 1].text).toBe('Hi')
    expect(runs).toHaveLength(2)
    expect(runs[1].t).toBe(mounted.t)
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('keeps t and locales across a re-render with no provider change', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const runs: Run[] = []
    const count = ref(1)
    const Greeting = defineComponent({
      setup() {
        const result = useTranslation()
        return () => {
          const text = `${result.t('greeting')} ${count.value}`
          runs.push({ t: result.t, locales: result.locales.value, text })
          return h('span', text)
        }
      },
    })
    mountWith(provider, Greeting)
    await nextTick()

    // A re-render with no provider change: a prop-like input moves.
    count.value = 2
    await nextTick()

    expect(runs).toHaveLength(2)
    expect(runs[1].t).toBe(runs[0].t)
    expect(runs[1].locales).toBe(runs[0].locales)
  })
})
