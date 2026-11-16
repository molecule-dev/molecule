// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `ContactForm`'s field labels — a port
 * of `@molecule/app-contact-form-react/src/__tests__/contact-form-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from `@molecule/app-vue`
 * subscribes to the provider, so the component re-renders on the switch. This
 * test bonds a provider with an `en` and a `fr` value for a key the component
 * renders, renders it in `en`, switches to `fr`, and asserts the DOM now shows
 * the French value.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses.
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
      props: { type: { type: String, default: 'button' }, disabled: { type: Boolean } },
      setup(props, { slots }) {
        return () => h('button', { type: props.type, disabled: props.disabled }, slots.default?.())
      },
    }),
    Input: defineComponent({
      name: 'Input',
      inheritAttrs: false,
      setup(_props, { attrs }) {
        return () => h('input', { ...(attrs as Record<string, unknown>) })
      },
    }),
    Textarea: defineComponent({
      name: 'Textarea',
      inheritAttrs: false,
      setup(_props, { attrs }) {
        return () => h('textarea', { ...(attrs as Record<string, unknown>) })
      },
    }),
  }
})

import { ContactForm } from '../ContactForm.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'contactForm.label.name': 'Name' } },
    { code: 'fr', name: 'French', translations: { 'contactForm.label.name': 'Nom' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ContactForm locale switch', () => {
  it('renders the name label in French after setLocale', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(defineComponent({ render: () => h(ContactForm, { onSubmit: () => {} }) }))
    app.mount(host)
    const field = () => host.querySelector('input[type="text"]')!
    expect(field().getAttribute('aria-label')).toBe('Name')

    // The switch itself: the component must re-render in French.
    await provider.setLocale('fr')
    await nextTick()

    expect(field().getAttribute('aria-label')).toBe('Nom')
  })
})
