// @vitest-environment jsdom
/**
 * Every string the Vue `ContactForm` writes itself goes through i18n — a port
 * of `@molecule/app-contact-form-react/src/__tests__/contact-form-i18n.test.tsx`:
 * the same test names and assertions. The bonded provider's `t` is mocked to a
 * marker (`«key»`), so a label that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with, carrying
// every attribute through to the native element.
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

import { createApp, defineComponent, h, nextTick } from 'vue'

import { ContactForm } from '../ContactForm.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link ContactForm} and returns its root element.
 *
 * @param props - The component props, beyond the required `onSubmit`.
 * @returns The form element the component rendered.
 */
const mountForm = (props: Record<string, unknown> = {}): HTMLFormElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({ render: () => h(ContactForm, { onSubmit: () => {}, ...props }) }),
  )
  app.mount(host)
  return host.querySelector('form')!
}

describe('ContactForm i18n', () => {
  it('takes the field labels through i18n by default', () => {
    const form = mountForm()
    expect(form.querySelector('input[type="text"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.name»',
    )
    expect(form.querySelector('input[type="email"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.email»',
    )
    expect(form.querySelector('textarea')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.message»',
    )
  })

  it('takes the non-Error submit fallback through i18n by default', async () => {
    // The fallback renders only when `onSubmit` throws something that is not
    // an `Error` (a rejected `Error` shows its own `.message` verbatim).
    const form = mountForm({ onSubmit: () => Promise.reject('boom') })
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()
    expect(form.textContent).toContain('«contactForm.error.submissionFailed»')
  })
})
