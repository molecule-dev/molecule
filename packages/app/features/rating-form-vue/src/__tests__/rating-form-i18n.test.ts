/**
 * The comment field's label goes through i18n — the Vue port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form-i18n.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom. The React
 * original had the label as the English literal `"Comment"` in the JSX (found
 * by the pseudo-locale check); these tests mock `useTranslation` with a `t`
 * that marks every key, so a string that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { RatingForm } from '../RatingForm.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link RatingForm} and returns the markup it produced. */
const render = (
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({ render: () => h(RatingForm, { onSubmit: () => {}, ...props }, slots) }),
  )
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('RatingForm i18n', () => {
  it('renders the comment field label through t', () => {
    expect(render()).toContain('aria-label="«rating.comment»"')
  })

  it('an explicit commentPlaceholder overrides the translated placeholder', () => {
    const markup = render({ commentPlaceholder: 'Tell us more' })
    expect(markup).toContain('placeholder="Tell us more"')
    expect(markup).not.toContain('«rating.commentPlaceholder»')
  })
})
