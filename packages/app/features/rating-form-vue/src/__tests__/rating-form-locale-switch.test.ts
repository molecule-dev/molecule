// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `RatingForm`'s comment field label and
 * star labels — the Vue port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from `@molecule/app-vue`
 * reads the provider in the render function, so the form re-renders on the
 * switch. This test bonds a provider with `en` and `de` values for the comment
 * label and the star-label format, renders in `en`, switches to `de`, and
 * asserts both strings now show the German values.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Vue suite uses.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: {
        type: { type: String, default: 'button' },
        disabled: { type: Boolean, default: false },
      },
      setup(props, { slots }) {
        return () =>
          h(
            'button',
            { 'data-button': '', type: props.type, disabled: props.disabled },
            slots.default?.(),
          )
      },
    }),
    Textarea: defineComponent({
      name: 'Textarea',
      inheritAttrs: false,
      props: { placeholder: String },
      setup(props, { attrs }) {
        return () =>
          h('textarea', {
            'data-textarea': '',
            placeholder: props.placeholder,
            'aria-label': (attrs as Record<string, unknown>)['aria-label'],
          })
      },
    }),
  }
})

// No mock of `@molecule/app-vue`: the real useTranslation reads the bonded
// provider, which is what the switch drives.
import { RatingForm } from '../RatingForm.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

const apps: ReturnType<typeof createApp>[] = []

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'rating.comment': 'Comment', 'rating.star': '{{n}} of {{max}}' },
    },
    {
      code: 'de',
      name: 'German',
      translations: { 'rating.comment': 'Kommentar', 'rating.star': '{{n}} von {{max}}' },
    },
  ])
  setProvider(provider)
})

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('RatingForm locale switch', () => {
  it('the comment field label and star labels follow a locale switch', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(defineComponent({ render: () => h(RatingForm, { onSubmit: () => {} }) }))
    apps.push(app)
    app.mount(host)
    const textarea = host.querySelector('[data-textarea]')
    const firstStar = host.querySelector('[data-mol-id="rating-form-star"]')
    expect(textarea?.getAttribute('aria-label')).toBe('Comment')
    expect(firstStar?.getAttribute('aria-label')).toBe('1 of 5')

    // The switch itself: the label must follow it without an unrelated
    // re-render, and the star format must interpolate the same values.
    await provider.setLocale('de')
    await nextTick()

    expect(textarea?.getAttribute('aria-label')).toBe('Kommentar')
    expect(firstStar?.getAttribute('aria-label')).toBe('1 von 5')
  })
})
