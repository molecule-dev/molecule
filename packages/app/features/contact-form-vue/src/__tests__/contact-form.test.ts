// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ContactForm` — a port of
 * `@molecule/app-contact-form-react`'s own suite: the same behavioral
 * assertions, rendered with Vue in jsdom and asserted on the markup the
 * component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React suite uses.
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

// The React suite's translation mock: each key falls back to its default value.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with: a
// `data-button` button, a `data-input` field and a `data-textarea` field.
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
      props: {},
      setup(_props, { attrs }) {
        return () =>
          h('input', {
            'data-input': '',
            'aria-label': (attrs as Record<string, unknown>)['aria-label'],
          })
      },
    }),
    Textarea: defineComponent({
      name: 'Textarea',
      inheritAttrs: false,
      props: {},
      setup(_props, { attrs }) {
        return () =>
          h('textarea', {
            'data-textarea': '',
            'aria-label': (attrs as Record<string, unknown>)['aria-label'],
          })
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { ContactForm } from '../ContactForm.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link ContactForm} and returns the markup it produced. */
const render = (
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: () => h(ContactForm, { onSubmit: () => {}, ...props }, slots),
    }),
  )
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('ContactForm', () => {
  it('renders the name, email, and message fields', () => {
    const markup = render()
    expect(markup).toContain('aria-label="Name"')
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('aria-label="Message"')
  })

  it('renders the title and description when present and omits the header otherwise', () => {
    const withHeader = render(
      {},
      { title: () => ['Contact us'], description: () => ['we reply fast'] },
    )
    expect(withHeader).toContain('Contact us')
    expect(withHeader).toContain('we reply fast')
    const without = render()
    expect(without).not.toContain('<header')
  })

  it('renders the default submit label', () => {
    const markup = render()
    expect(markup).toContain('Send message')
  })

  it('honours a custom submitLabel', () => {
    const markup = render({}, { submitLabel: () => ['Get in touch'] })
    expect(markup).toContain('Get in touch')
    expect(markup).not.toContain('Send message')
  })

  it('renders the extraFields slot', () => {
    const markup = render({}, { extraFields: () => [h('input', { 'data-extra': '' })] })
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className onto the form', () => {
    const markup = render({ className: 'cf-cls' })
    expect(markup).toContain('cf-cls')
  })
})
