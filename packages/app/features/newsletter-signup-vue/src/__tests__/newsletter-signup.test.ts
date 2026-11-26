// @vitest-environment jsdom
/**
 * Unit tests for the Vue `NewsletterSignup` — a port of
 * `@molecule/app-newsletter-signup-react`'s own suite: the same behavioral
 * assertions, rendered with Vue in jsdom and asserted on the markup the
 * component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React suite uses.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// The React suite's translation mock: each key falls back to its default value.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with: a
// `data-button` button and a `data-input` field.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { NewsletterSignup } from '../NewsletterSignup.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link NewsletterSignup} and returns the markup it produced. */
const render = (
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: () => h(NewsletterSignup, { onSubscribe: () => {}, ...props }, slots),
    }),
  )
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('NewsletterSignup', () => {
  it('renders the email input and subscribe button', () => {
    const markup = render()
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('Subscribe')
  })

  it('renders the default email placeholder and honours a custom one', () => {
    expect(render()).toContain('placeholder="Your email"')
    expect(render({ placeholder: 'name@co.com' })).toContain('placeholder="name@co.com"')
  })

  it('renders the title and description when present and omits them otherwise', () => {
    const full = render(
      {},
      { title: () => ['Stay in the loop'], description: () => ['monthly digest'] },
    )
    expect(full).toContain('Stay in the loop')
    expect(full).toContain('monthly digest')
    expect(render()).not.toContain('<h4')
  })

  it('honours a custom buttonLabel', () => {
    const markup = render({}, { buttonLabel: () => ['Join now'] })
    expect(markup).toContain('Join now')
    expect(markup).not.toContain('Subscribe')
  })

  it('forwards className onto the form', () => {
    expect(render({ className: 'ns-cls' })).toContain('ns-cls')
  })
})
