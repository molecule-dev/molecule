// @vitest-environment jsdom
/**
 * Unit tests for the Vue `RatingForm` — a port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
// `data-button` button and a `data-textarea` field.
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
      props: {
        placeholder: String,
      },
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

describe('RatingForm', () => {
  it('renders the title when present and omits it otherwise', () => {
    expect(render({ title: 'Rate us' })).toContain('Rate us')
    expect(render()).not.toContain('<h3')
  })

  it('renders a radiogroup with one star button per max', () => {
    const markup = render({ max: 5 })
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(5)
  })

  it('renders a focusable radiogroup', () => {
    const group = render().match(/<div[^>]*role="radiogroup"[^>]*>/)?.[0] ?? ''
    // Focusable so jsx-a11y's interactive-supports-focus is satisfied (the
    // group carries onMouseleave), but never a tab stop: -1 keeps it out of
    // the tab order, and the stars carry the keyboard instead.
    expect(group).toContain('tabindex="-1"')
  })

  it('marks the defaultRating star aria-checked', () => {
    const markup = render({ defaultRating: 3 })
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('renders the comment textarea with a default placeholder', () => {
    const markup = render()
    expect(markup).toContain('data-textarea=""')
    expect(markup).toContain('Share your thoughts')
  })

  it('disables the submit button until a rating is chosen', () => {
    const noRating = render()
    expect(noRating).toMatch(/<button[^>]*data-button=""[^>]*disabled/)
    const withRating = render({ defaultRating: 4 })
    expect(withRating).not.toMatch(/<button[^>]*data-button=""[^>]*disabled/)
  })

  it('honours a custom submitLabel and forwards className', () => {
    const markup = render({ defaultRating: 4, submitLabel: 'Post review', className: 'rf-cls' })
    expect(markup).toContain('Post review')
    expect(markup).toContain('rf-cls')
  })
})
