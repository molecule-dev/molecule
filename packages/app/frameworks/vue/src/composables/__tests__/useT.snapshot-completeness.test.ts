// @vitest-environment jsdom
/**
 * A change announced while the composable cannot yet hear it must still be
 * observed.
 *
 * The notification listener a composable attaches starts in the mount phase.
 * A change fired before that — from a child's or an earlier sibling's mount
 * hook, or while the tree hides the reader with `v-if` so its effects are
 * unmounted — never reaches it. These tests require the text to update anyway:
 * the mounted reader reconciles the provider once it subscribes, so the text
 * reflects the change.
 *
 * The React file this ports probes React-only mechanisms (layout effects,
 * StrictMode, `Activity`, a discarded render). Those have no Vue counterpart;
 * what a caller observes under them is ported instead.
 *
 * @module
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { type Component, defineComponent, h, nextTick, onMounted, ref, watch } from 'vue'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { moleculePlugin } from '../../plugin.js'
import { useT, useTranslation } from '../useTranslation.js'

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
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

/**
 * A child that registers translations from its mount hook: Vue mounts children
 * first, so it runs before its parent's hook (React's layout-effect ordering).
 *
 * @param provider - The provider to register the text with.
 * @returns The component.
 */
function addInLayout(provider: I18nProvider): Component {
  return defineComponent({
    setup() {
      onMounted(() => {
        provider.addTranslations('en', LATE)
      })
      return () => null
    },
  })
}

/**
 * A child that switches the locale from its mount hook.
 *
 * @param provider - The provider to switch.
 * @param to - The locale to switch to.
 * @returns The component.
 */
function switchInLayout(provider: I18nProvider, to: string): Component {
  return defineComponent({
    setup() {
      onMounted(() => {
        void provider.setLocale(to)
      })
      return () => null
    },
  })
}

/**
 * A reader that renders one key through `useT`.
 *
 * @param key - The key to render.
 * @param fallback - The inline English fallback.
 * @param testId - The `data-testid` the span carries.
 * @returns The component.
 */
function textReader(key: string, fallback: string, testId: string): Component {
  return defineComponent({
    setup() {
      const t = useT()
      return () => h('span', { 'data-testid': testId }, t(key, fallback))
    },
  })
}

/**
 * A reader that renders text, locale and direction through `useTranslation`.
 *
 * @returns The component.
 */
function detailReader(): Component {
  return defineComponent({
    setup() {
      const { t, locale, direction } = useTranslation()
      return () =>
        h(
          'span',
          { 'data-testid': 'detail' },
          `${locale.value}/${direction.value}:${t('greeting', undefined, {
            defaultValue: 'Hello',
          })}|${t('late', undefined, { defaultValue: 'Pending' })}`,
        )
    },
  })
}

describe("a same-locale add in a child's mount hook", () => {
  it('useT: the parent renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const AddInLayout = addInLayout(provider)
    const Shell = defineComponent({
      setup() {
        const t = useT()
        return () =>
          h('div', [h('span', { 'data-testid': 'shell' }, t('late', 'Pending')), h(AddInLayout)])
      },
    })

    const wrapper = mountWith(provider, Shell)
    await nextTick()

    expect(wrapper.get('[data-testid="shell"]').text()).toBe('Loaded')
  })

  it('useTranslation: the parent renders the added text with the current locale/direction', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const AddInLayout = addInLayout(provider)
    const Shell = defineComponent({
      setup() {
        const { t, locale, direction } = useTranslation()
        return () =>
          h('div', [
            h(
              'span',
              { 'data-testid': 'shell' },
              `${locale.value}/${direction.value}:${t('late', undefined, {
                defaultValue: 'Pending',
              })}`,
            ),
            h(AddInLayout),
          ])
      },
    })

    const wrapper = mountWith(provider, Shell)
    await nextTick()

    expect(wrapper.get('[data-testid="shell"]').text()).toBe('en/ltr:Loaded')
  })
})

describe("a same-locale add in an earlier sibling's mount hook", () => {
  it('useT: the later sibling renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const AddInLayout = addInLayout(provider)
    const LateText = textReader('late', 'Pending', 'late')
    const Root = defineComponent({
      setup() {
        return () => h('div', [h(AddInLayout), h(LateText)])
      },
    })

    const wrapper = mountWith(provider, Root)
    await nextTick()

    expect(wrapper.get('[data-testid="late"]').text()).toBe('Loaded')
  })

  it('useTranslation: the later sibling renders text and locale together', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const AddInLayout = addInLayout(provider)
    const Detail = detailReader()
    const Root = defineComponent({
      setup() {
        return () => h('div', [h(AddInLayout), h(Detail)])
      },
    })

    const wrapper = mountWith(provider, Root)
    await nextTick()

    expect(wrapper.get('[data-testid="detail"]').text()).toBe('en/ltr:Hello|Loaded')
  })
})

describe('a same-locale change while v-if hides the reader', () => {
  it('useT: effects are unmounted while hidden and the text updates on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    const visible = ref(true)
    const Detail = detailReader()
    const Scene = defineComponent({
      setup() {
        return () => (visible.value ? h(Detail) : null)
      },
    })

    const wrapper = mountWith(provider, Scene)
    expect(wrapper.get('[data-testid="detail"]').text()).toBe('en/ltr:Hello|Pending')
    expect(live()).toBe(1)

    visible.value = false
    await nextTick()
    // The premise of the case: a hidden reader unmounts, so no listener exists.
    expect(live()).toBe(0)

    provider.addTranslations('en', LATE)

    visible.value = true
    await nextTick()
    await nextTick()

    expect(wrapper.get('[data-testid="detail"]').text()).toBe('en/ltr:Hello|Loaded')
  })

  it('useTranslation: a locale switch while hidden is shown on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const visible = ref(true)
    const Detail = detailReader()
    const Scene = defineComponent({
      setup() {
        return () => (visible.value ? h(Detail) : null)
      },
    })

    const wrapper = mountWith(provider, Scene)

    visible.value = false
    await nextTick()

    await provider.setLocale('fr')

    visible.value = true
    await nextTick()
    await nextTick()

    expect(wrapper.get('[data-testid="detail"]').text()).toBe('fr/ltr:Bonjour|Pending')
  })
})

describe('a locale switch before the listener exists (already caught by the locale in the snapshot)', () => {
  it("useT: a child's layout-effect switch is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const SwitchInLayout = switchInLayout(provider, 'fr')
    const Shell = defineComponent({
      setup() {
        const t = useT()
        return () =>
          h('div', [
            h('span', { 'data-testid': 'shell' }, t('greeting', 'Hello')),
            h(SwitchInLayout),
          ])
      },
    })

    const wrapper = mountWith(provider, Shell)
    await nextTick()

    expect(wrapper.get('[data-testid="shell"]').text()).toBe('Bonjour')
  })
})

describe('ordinary events and notifications stay green', () => {
  it("useT: an add from the reader's own mount effect is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const AddInEffect = addInLayout(provider)
    const Shell = defineComponent({
      setup() {
        const t = useT()
        return () =>
          h('div', [h('span', { 'data-testid': 'shell' }, t('late', 'Pending')), h(AddInEffect)])
      },
    })

    const wrapper = mountWith(provider, Shell)
    await nextTick()

    expect(wrapper.get('[data-testid="shell"]').text()).toBe('Loaded')
  })

  it('useT: a later add while mounted re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const LateText = textReader('late', 'Pending', 'late')
    const wrapper = mountWith(provider, LateText)

    provider.addTranslations('en', LATE)
    await nextTick()

    expect(wrapper.get('[data-testid="late"]').text()).toBe('Loaded')
  })

  it('useT: an English fallback added while French is active re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const LateText = textReader('late', 'Pending', 'late')
    const wrapper = mountWith(provider, LateText)

    await provider.setLocale('fr')
    await nextTick()

    provider.addTranslations('en', LATE)
    await nextTick()

    expect(wrapper.get('[data-testid="late"]').text()).toBe('Loaded')
  })

  it('useT: an unchanged re-registration while rendering does not loop', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    let renders = 0
    const bump = ref(0)
    const SelfRegistering = defineComponent({
      setup() {
        const t = useT()
        return () => {
          renders += 1
          void bump.value
          provider.addTranslations('en', { own: 'Own text' })
          return h('span', { 'data-testid': 'own' }, t('own', 'Pending'))
        }
      },
    })

    const wrapper = mountWith(provider, SelfRegistering)
    expect(wrapper.get('[data-testid="own"]').text()).toBe('Own text')

    // A re-render registers the same translations again; a notification would loop forever.
    await nextTick()
    bump.value += 1
    await nextTick()

    expect(wrapper.get('[data-testid="own"]').text()).toBe('Own text')
    expect(renders).toBeLessThanOrEqual(3)
  })
})

describe('identity, lifecycle and provider replacement accepted fixes are preserved', () => {
  it('useT: one callback identity across re-renders and a locale change, one effect run', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const seen: unknown[] = []
    let effectRuns = 0
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
          seen.push(t)
          return h('span', { 'data-testid': 'text' }, t('greeting', 'Hello'))
        }
      },
    })

    const wrapper = mountWith(provider, Probe)
    const first = seen[0]

    await provider.setLocale('fr')
    await nextTick()

    expect(new Set(seen).size).toBe(1)
    expect(seen[0]).toBe(first)
    expect(effectRuns).toBe(1)
    expect(wrapper.get('[data-testid="text"]').text()).toBe('Bonjour')
  })

  it('useT: one live subscription under StrictMode and none after unmount', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)
    const Greeting = textReader('greeting', 'Hello', 'text')

    // Vue has no StrictMode: the observable contract is one live subscription
    // while mounted, and none after unmount.
    const wrapper = mountWith(provider, Greeting)
    expect(live()).toBe(1)

    await provider.setLocale('fr')
    await nextTick()
    expect(wrapper.get('[data-testid="text"]').text()).toBe('Bonjour')

    wrapper.unmount()
    release(wrapper)
    expect(live()).toBe(0)
  })

  it('useT: replacing the provider in place moves the subscription and updates text', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)
    const Greeting = textReader('greeting', 'Hello', 'text')

    // Vue resolves an injected provider at setup, so a caller replaces one by
    // rendering the subtree under the new provider; the observable contract is
    // that the subscription follows the provider the reader renders under.
    const first = mountWith(providerA, Greeting)
    expect([liveA(), liveB()]).toEqual([1, 0])
    expect(first.get('[data-testid="text"]').text()).toBe('Hello')

    first.unmount()
    release(first)

    const second = mountWith(providerB, Greeting)
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(second.get('[data-testid="text"]').text()).toBe('Bonjour')

    providerB.addTranslations('fr', { greeting: 'Salut' })
    await nextTick()
    expect(second.get('[data-testid="text"]').text()).toBe('Salut')
  })

  it('useT: a provider without getRevision still re-renders on ordinary notifications', async () => {
    const provider: I18nProvider & { getRevision?: () => number } = createSimpleI18nProvider(
      'en',
      LOCALES,
    )
    // A provider written before the revision method existed: the composable must
    // fall back to counting notifications.
    delete provider.getRevision

    const LateText = textReader('late', 'Pending', 'late')
    const wrapper = mountWith(provider, LateText)

    provider.addTranslations('en', LATE)
    await nextTick()

    expect(wrapper.get('[data-testid="late"]').text()).toBe('Loaded')
  })
})
