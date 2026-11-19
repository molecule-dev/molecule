// @vitest-environment jsdom
/**
 * `useT()` re-renders its caller on locale notifications, keeps one function
 * identity, and preserves the provider call shapes.
 *
 * Ports `useT.test.tsx` from `@molecule/app-react`. React's `rerender`, its
 * effect-dependency identity and its in-place provider swap are React-only
 * mechanisms; what a caller observes under them is ported instead.
 *
 * @module
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type Component, defineComponent, h, nextTick, ref, watch } from 'vue'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { moleculePlugin } from '../../plugin.js'
import { useT, useTranslation } from '../useTranslation.js'

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

describe('useT', () => {
  it('re-renders on a locale change when the component uses only useT()', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Probe = defineComponent({
      setup() {
        const t = useT()
        return () =>
          h('span', { 'data-testid': 'text' }, t('greeting', undefined, { defaultValue: 'Hello' }))
      },
    })

    const wrapper = mountWith(provider, Probe)
    expect(wrapper.get('[data-testid="text"]').text()).toBe('Hello')

    await provider.setLocale('fr')
    await nextTick()
    expect(wrapper.get('[data-testid="text"]').text()).toBe('Bonjour')
  })

  it('re-renders when addTranslations adds keys for the active locale', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Probe = defineComponent({
      setup() {
        const t = useT()
        return () =>
          h('span', { 'data-testid': 'late' }, t('lateKey', undefined, { defaultValue: 'Pending' }))
      },
    })

    const wrapper = mountWith(provider, Probe)
    await nextTick()
    expect(wrapper.get('[data-testid="late"]').text()).toBe('Pending')

    provider.addTranslations('en', { lateKey: 'Loaded' })
    await nextTick()
    expect(wrapper.get('[data-testid="late"]').text()).toBe('Loaded')
  })

  it('keeps the returned identity across re-renders AND locale changes', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const seen: Array<ReturnType<typeof useT>> = []
    const bump = ref(0)
    const Probe = defineComponent({
      setup() {
        const t = useT()
        return () => {
          seen.push(t)
          void bump.value
          return h(
            'span',
            { 'data-testid': 'text' },
            t('greeting', undefined, { defaultValue: 'Hello' }),
          )
        }
      },
    })

    const wrapper = mountWith(provider, Probe)
    await nextTick()
    const first = seen[seen.length - 1]
    bump.value += 1
    await nextTick()
    expect(seen[seen.length - 1]).toBe(first)

    const rendersBefore = seen.length
    await provider.setLocale('fr')
    await nextTick()
    // The composable's caller re-rendered (so text is fresh) AND the function identity survived.
    expect(seen.length).toBeGreaterThan(rendersBefore)
    expect(seen[seen.length - 1]).toBe(first)
    expect(wrapper.get('[data-testid="text"]').text()).toBe('Bonjour')
  })

  it('does not re-run an effect that depends on the returned function', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    let effectRuns = 0
    const bump = ref(0)
    const Probe = defineComponent({
      setup() {
        const t = useT()
        // React's `useEffect(..., [t])`: runs once, and again only if the
        // function identity moves. Vue watches the getter's value the same way.
        watch(
          () => t,
          () => {
            effectRuns += 1
          },
          { immediate: true },
        )
        return () => {
          void bump.value
          return h(
            'span',
            { 'data-testid': 'text' },
            t('greeting', undefined, { defaultValue: 'Hello' }),
          )
        }
      },
    })

    const wrapper = mountWith(provider, Probe)
    await nextTick()
    bump.value += 1
    await nextTick()
    await provider.setLocale('fr')
    await nextTick()
    // The failure class: a per-render identity re-ran this effect forever.
    expect(effectRuns).toBe(1)
    expect(wrapper.get('[data-testid="text"]').text()).toBe('Bonjour')
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
    const Probe = defineComponent({
      setup() {
        const t = useT()
        return () =>
          h('span', { 'data-testid': 'text' }, t('greeting', undefined, { defaultValue: 'Hello' }))
      },
    })

    // Vue resolves the injected provider at setup, so the caller replaces one
    // by rendering the subtree under the new provider.
    const first = mountWith(providerA, Probe)
    await nextTick()
    expect(first.get('[data-testid="text"]').text()).toBe('Hello')

    first.unmount()
    release(first)
    expect(unsubscribeA).toHaveBeenCalledTimes(1)

    const second = mountWith(providerB, Probe)
    await nextTick()
    expect(second.get('[data-testid="text"]').text()).toBe('Salut from B')

    providerB.addTranslations('en', { greeting: 'Salut encore' })
    await nextTick()
    expect(second.get('[data-testid="text"]').text()).toBe('Salut encore')
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
    const Probe = defineComponent({
      setup() {
        const t = useT()
        return () => h('span', t('greeting', undefined, { defaultValue: 'Hello' }))
      },
    })

    const wrapper = mountWith(provider, Probe)
    await nextTick()
    wrapper.unmount()
    release(wrapper)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('preserves the existing values/defaultValue/count call shapes', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Probe = defineComponent({
      setup() {
        const t = useT()
        return () =>
          h('div', [
            h('span', { 'data-testid': 'values' }, t('welcome', { name: 'Alice' })),
            h(
              'span',
              { 'data-testid': 'default' },
              t('missing.key', undefined, { defaultValue: 'Fallback' }),
            ),
            h('span', { 'data-testid': 'plural' }, t('item', { count: 2 }, { count: 2 })),
            h(
              'span',
              { 'data-testid': 'count-fallback' },
              t('missing.item', undefined, { defaultValue: '{{count}} things', count: 3 }),
            ),
          ])
      },
    })

    const wrapper = mountWith(provider, Probe)
    await nextTick()
    expect(wrapper.get('[data-testid="values"]').text()).toBe('Welcome, Alice!')
    expect(wrapper.get('[data-testid="default"]').text()).toBe('Fallback')
    expect(wrapper.get('[data-testid="plural"]').text()).toBe('2 items')
    expect(wrapper.get('[data-testid="count-fallback"]').text()).toBe('3 things')
  })

  it('accepts an inline fallback string as the second argument', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Probe = defineComponent({
      setup() {
        const t = useT()
        return () =>
          h('div', [
            h('span', { 'data-testid': 'fallback' }, t('missing.key', 'English fallback')),
            h('span', { 'data-testid': 'translated' }, t('greeting', 'English fallback')),
            h(
              'span',
              { 'data-testid': 'interpolated' },
              t('missing.template', '{{count}} items', { count: 3 }),
            ),
            h('span', { 'data-testid': 'plural' }, t('item', '{{count}} things', { count: 1 })),
          ])
      },
    })

    const wrapper = mountWith(provider, Probe)
    await nextTick()
    expect(wrapper.get('[data-testid="fallback"]').text()).toBe('English fallback')
    expect(wrapper.get('[data-testid="translated"]').text()).toBe('Hello')
    expect(wrapper.get('[data-testid="interpolated"]').text()).toBe('3 items')
    expect(wrapper.get('[data-testid="plural"]').text()).toBe('1 item')
  })
})

describe('useTranslation (control — existing behaviour)', () => {
  it('still re-renders on a locale change and translates', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const Probe = defineComponent({
      setup() {
        const { t, locale } = useTranslation()
        return () =>
          h(
            'span',
            { 'data-testid': 'text' },
            `${locale.value}:${t('greeting', undefined, { defaultValue: 'Hello' })}`,
          )
      },
    })

    const wrapper = mountWith(provider, Probe)
    await nextTick()
    expect(wrapper.get('[data-testid="text"]').text()).toBe('en:Hello')

    await provider.setLocale('fr')
    await nextTick()
    expect(wrapper.get('[data-testid="text"]').text()).toBe('fr:Bonjour')
  })
})
