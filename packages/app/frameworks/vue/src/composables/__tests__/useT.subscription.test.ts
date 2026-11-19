// @vitest-environment jsdom
/**
 * A notification fired before the composable subscribes must still reach the
 * reader, and a replaced provider must move the subscription.
 *
 * Ports `useT.subscription.test.tsx` from `@molecule/app-react`. React's
 * layout effects, StrictMode and its in-place provider swap are React-only
 * mechanisms; what a caller observes under them is ported instead.
 *
 * @module
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { type Component, defineComponent, h, nextTick, onMounted, ref } from 'vue'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { moleculePlugin } from '../../plugin.js'
import { useT, useTranslation } from '../useTranslation.js'

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
  { code: 'ar', name: 'Arabic', direction: 'rtl', translations: { greeting: 'Marhaba' } },
]

const LATE = { late: 'Loaded' }

const wrappers: VueWrapper[] = []

const mountWith = (provider: I18nProvider, component: Component): VueWrapper => {
  const wrapper = mount(component, {
    global: { plugins: [[moleculePlugin, { i18n: provider }]] },
  })
  wrappers.push(wrapper)
  return wrapper
}

/** Drops a wrapper the test unmounted itself, so cleanup does not unmount twice. */
const release = (wrapper: VueWrapper): void => {
  const index = wrappers.indexOf(wrapper)
  if (index >= 0) wrappers.splice(index, 1)
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

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

/** A child that switches the locale from its mount hook, before later siblings and parents. */
function switchOnMount(provider: I18nProvider, to: string): Component {
  return defineComponent({
    setup() {
      onMounted(() => {
        void provider.setLocale(to)
      })
      return () => null
    },
  })
}

/** A child that registers English translations from its mount hook. */
function addOnMount(provider: I18nProvider): Component {
  return defineComponent({
    setup() {
      onMounted(() => {
        provider.addTranslations('en', LATE)
      })
      return () => null
    },
  })
}

/** A reader that renders one key through `useT`. */
function textReader(key: string, fallback: string, testId: string): Component {
  return defineComponent({
    setup() {
      const t = useT()
      return () => h('span', { 'data-testid': testId }, t(key, fallback))
    },
  })
}

/** A reader that renders locale, direction and a translated key through `useTranslation`. */
function detailReader(): Component {
  return defineComponent({
    setup() {
      const { t, locale, direction } = useTranslation()
      return () =>
        h(
          'span',
          { 'data-testid': 'text' },
          `${locale.value}/${direction.value}:${t('greeting', undefined, { defaultValue: 'Hello' })}`,
        )
    },
  })
}

describe('a notification fired before the composable subscribes', () => {
  it("useT: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Switch = switchOnMount(provider, 'fr')
    const Greeting = textReader('greeting', 'Hello', 'text')
    const Root = defineComponent({
      setup() {
        return () => h('div', [h(Switch), h(Greeting)])
      },
    })

    const wrapper = mountWith(provider, Root)
    await nextTick()

    expect(wrapper.get('[data-testid="text"]').text()).toBe('Bonjour')
  })

  it("useT: from a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Switch = switchOnMount(provider, 'fr')
    const Shell = defineComponent({
      setup() {
        const t = useT()
        return () =>
          h('div', [h('span', { 'data-testid': 'title' }, t('greeting', 'Hello')), h(Switch)])
      },
    })

    const wrapper = mountWith(provider, Shell)
    await nextTick()

    expect(wrapper.get('[data-testid="title"]').text()).toBe('Bonjour')
  })

  it("useTranslation: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Switch = switchOnMount(provider, 'ar')
    const Probe = detailReader()
    const Root = defineComponent({
      setup() {
        return () => h('div', [h(Switch), h(Probe)])
      },
    })

    const wrapper = mountWith(provider, Root)
    await nextTick()

    expect(wrapper.get('[data-testid="text"]').text()).toBe('ar/rtl:Marhaba')
  })

  it("useT: translations added in a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Add = addOnMount(provider)
    const Shell = defineComponent({
      setup() {
        const t = useT()
        return () => h('div', [h('span', { 'data-testid': 'title' }, t('late', 'Pending')), h(Add)])
      },
    })

    const wrapper = mountWith(provider, Shell)
    await nextTick()

    expect(wrapper.get('[data-testid="title"]').text()).toBe('Loaded')
  })

  it("useTranslation: translations added in an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Add = addOnMount(provider)
    const Probe = defineComponent({
      setup() {
        const { t } = useTranslation()
        return () =>
          h('span', { 'data-testid': 'text' }, t('late', undefined, { defaultValue: 'Pending' }))
      },
    })
    const Root = defineComponent({
      setup() {
        return () => h('div', [h(Add), h(Probe)])
      },
    })

    const wrapper = mountWith(provider, Root)
    await nextTick()

    expect(wrapper.get('[data-testid="text"]').text()).toBe('Loaded')
  })
})

describe('a provider replaced in place (no remount)', () => {
  it('useTranslation: no commit pairs the new provider with the old locale and direction', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('ar', LOCALES)
    const commits: string[] = []
    const Probe = defineComponent({
      setup() {
        const { t, locale, direction } = useTranslation()
        return () => {
          const text = t('greeting', undefined, { defaultValue: 'Hello' })
          // What the user sees on this render.
          commits.push(`${locale.value}/${direction.value}:${text}`)
          return h('span', text)
        }
      },
    })

    const first = mountWith(providerA, Probe)
    await nextTick()
    expect(commits).toEqual(['en/ltr:Hello'])
    first.unmount()
    release(first)

    // Vue resolves the injected provider at setup, so a caller replaces one by
    // rendering the subtree under the new provider. No render pairs the new
    // provider's locale and direction with the old ones.
    const second = mountWith(providerB, Probe)
    await nextTick()
    expect(commits).toEqual(['en/ltr:Hello', 'ar/rtl:Marhaba'])
    second.unmount()
    release(second)
  })

  it('useT: moves its subscription and changes its identity once', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)
    const seen: unknown[] = []
    const Probe = defineComponent({
      setup() {
        const t = useT()
        return () => {
          seen.push(t)
          return h('span', { 'data-testid': 'text' }, t('greeting', 'Hello'))
        }
      },
    })

    const firstMount = mountWith(providerA, Probe)
    await nextTick()
    const first = seen[seen.length - 1]
    firstMount.unmount()
    release(firstMount)

    const secondMount = mountWith(providerB, Probe)
    await nextTick()
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(seen[seen.length - 1]).not.toBe(first)
    const swapped = seen[seen.length - 1]

    providerB.addTranslations('fr', { greeting: 'Salut' })
    await nextTick()
    // The identity moved once, with the provider, and stays put afterwards.
    expect(seen[seen.length - 1]).toBe(swapped)
    expect(secondMount.get('[data-testid="text"]').text()).toBe('Salut')
  })
})

describe('subscription lifecycle', () => {
  it('useT: one live subscription under StrictMode, updates, none after unmount', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    const Greeting = textReader('greeting', 'Hello', 'text')

    // Vue has no StrictMode: the observable contract is one live subscription
    // while mounted, updates on a locale switch, and none after unmount.
    const wrapper = mountWith(provider, Greeting)
    expect(live()).toBe(1)

    await provider.setLocale('fr')
    await nextTick()
    expect(wrapper.get('[data-testid="text"]').text()).toBe('Bonjour')

    wrapper.unmount()
    release(wrapper)
    expect(live()).toBe(0)
  })
})

describe('translations the rendered text depends on', () => {
  it('useT: re-renders when English keys arrive while another locale is active', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Late = textReader('lateKey', 'Pending', 'late')
    const wrapper = mountWith(provider, Late)

    await provider.setLocale('fr')
    await nextTick()

    provider.addTranslations('en', { lateKey: 'Loaded' })
    await nextTick()

    // `t()` falls back to English for a key French lacks.
    expect(wrapper.get('[data-testid="late"]').text()).toBe('Loaded')
  })

  it('re-registering the same translations while rendering does not loop', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const bump = ref(0)
    const SelfRegistering = defineComponent({
      setup() {
        const t = useT()
        return () => {
          void bump.value
          provider.addTranslations('en', { own: 'Own text' })
          return h('span', { 'data-testid': 'own' }, t('own', 'Pending'))
        }
      },
    })

    const wrapper = mountWith(provider, SelfRegistering)
    await nextTick()
    expect(wrapper.get('[data-testid="own"]').text()).toBe('Own text')

    // A second render re-registers the same translations; a notification would loop forever.
    bump.value += 1
    await nextTick()
    expect(wrapper.get('[data-testid="own"]').text()).toBe('Own text')
  })
})
