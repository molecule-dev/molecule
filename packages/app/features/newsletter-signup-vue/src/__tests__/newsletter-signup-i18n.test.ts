// @vitest-environment jsdom
/**
 * The Vue `NewsletterSignup`'s own text goes through i18n — a port of
 * `@molecule/app-newsletter-signup-react/src/__tests__/newsletter-signup-i18n.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom. With a
 * provider whose `t` marks every key (`«key»`), the email field's label and the
 * non-`Error` failure message render their key, and an explicit `placeholder`
 * prop still overrides the default.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// the same mock the React suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
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

afterEach(() => {
  document.body.innerHTML = ''
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

/** Submits the form once and lets the async handler settle. */
async function submit(host: HTMLElement): Promise<void> {
  host
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await Promise.resolve()
  await nextTick()
}

describe('NewsletterSignup text', () => {
  it('takes the email field label through i18n by default', () => {
    expect(render().querySelector('input')?.getAttribute('aria-label')).toBe(
      '«newsletter.label.email»',
    )
  })

  it('takes the subscription failure message through i18n by default', async () => {
    // A non-`Error` rejection is where the component supplies its own message.
    const host = render({ onSubscribe: () => Promise.reject('nope') })
    await submit(host)
    expect(host.querySelector('form')?.textContent).toContain(
      '«newsletter.error.subscriptionFailed»',
    )
  })

  it('keeps an explicit placeholder over the translated default', () => {
    expect(
      render({ placeholder: 'name@co.com' }).querySelector('input')?.getAttribute('placeholder'),
    ).toBe('name@co.com')
  })
})
