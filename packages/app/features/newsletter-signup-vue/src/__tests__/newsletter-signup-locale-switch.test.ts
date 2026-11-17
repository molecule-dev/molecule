// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `NewsletterSignup`'s own texts — a port
 * of
 * `@molecule/app-newsletter-signup-react/src/__tests__/newsletter-signup-locale-switch.test.tsx`:
 * the same test names and assertions. `useTranslation()` from
 * `@molecule/app-vue` subscribes to the bonded provider, so the form re-renders
 * on the switch. This test bonds a provider with an `en` and a `fr` value for
 * the keys the component renders, renders it in `en`, switches to `fr`, and
 * asserts the DOM now shows the French values.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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
    Input: defineComponent({
      name: 'Input',
      inheritAttrs: false,
      props: {
        placeholder: String,
        required: { type: Boolean, default: false },
      },
      setup(props, { attrs }) {
        return () =>
          h('input', {
            'data-input': '',
            placeholder: props.placeholder,
            required: props.required,
            'aria-label': (attrs as Record<string, unknown>)['aria-label'],
          })
      },
    }),
  }
})

import { createApp, defineComponent, h, nextTick } from 'vue'

import { NewsletterSignup } from '../NewsletterSignup.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: {
        'newsletter.label.email': 'Email',
        'newsletter.error.subscriptionFailed': 'Subscription failed',
      },
    },
    {
      code: 'fr',
      name: 'French',
      translations: {
        'newsletter.label.email': 'Adresse e-mail',
        'newsletter.error.subscriptionFailed': "L'abonnement a échoué",
      },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
  await nextTick()
})

/** Renders a {@link NewsletterSignup} and returns its host element. */
const render = (props: Record<string, unknown> = {}): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: () => h(NewsletterSignup, { onSubscribe: () => {}, ...props }),
    }),
  )
  app.mount(host)
  return host
}

describe('NewsletterSignup locale switch', () => {
  it('renders the email field label in French after setLocale', async () => {
    const host = render()
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Email')

    await provider.setLocale('fr')
    await nextTick()

    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Adresse e-mail')
    expect(host.querySelector('input')?.getAttribute('aria-label')).not.toBe('Email')
  })

  it('renders the subscription failure message in French after setLocale', async () => {
    const host = render({ onSubscribe: () => Promise.reject('nope') })
    await provider.setLocale('fr')
    await nextTick()
    host
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    await nextTick()

    expect(host.querySelector('form')?.textContent).toContain("L'abonnement a échoué")
    expect(host.querySelector('form')?.textContent).not.toContain('Subscription failed')
  })
})
