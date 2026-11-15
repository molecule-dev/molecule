// @vitest-environment jsdom
/**
 * Unit tests for the Vue `InlineEdit` — a port of
 * `@molecule/app-inline-edit-react/src/__tests__/inline-edit.test.tsx`: the
 * same test names and behavioral assertions, rendered with Vue in jsdom and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The same markers the React suite's UI mocks render.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: { variant: String, size: String, color: String, disabled: Boolean },
      emits: ['click'],
      setup(_props, { slots }) {
        return () => h('button', { 'data-button': '' }, slots.default?.())
      },
    }),
    Input: defineComponent({
      name: 'Input',
      props: { type: String, value: String },
      setup() {
        return () => h('input', { 'data-input': '' })
      },
    }),
    Textarea: defineComponent({
      name: 'Textarea',
      props: { value: String },
      setup() {
        return () => h('textarea', { 'data-textarea': '' })
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { InlineEdit } from '../InlineEdit.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders an {@link InlineEdit} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(InlineEdit, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

// The edit state only appears after a click; SSR covers the read state.
describe('InlineEdit (read state)', () => {
  it('renders the value as plain text', () => {
    const markup = render({ value: 'Hello world', onSubmit: () => {} })
    expect(markup).toContain('Hello world')
  })

  it('exposes a button role for the read-state trigger', () => {
    const markup = render({ value: 'x', onSubmit: () => {} })
    expect(markup).toContain('role="button"')
  })

  it('shows the placeholder when the value is empty', () => {
    const def = render({ value: '', onSubmit: () => {} })
    expect(def).toContain('Click to edit')
    const custom = render({ value: '', onSubmit: () => {}, placeholder: 'Add a title' })
    expect(custom).toContain('Add a title')
  })

  it('uses renderRead to format the value when supplied', () => {
    const markup = render({
      value: 'raw',
      onSubmit: () => {},
      renderRead: (v: string): VNodeChild => h('strong', { 'data-read': '' }, v.toUpperCase()),
    })
    expect(markup).toContain('data-read=""')
    expect(markup).toContain('RAW')
  })

  it('does not render the editor inputs before being clicked', () => {
    const markup = render({ value: 'x', onSubmit: () => {} })
    expect(markup).not.toContain('data-input')
    expect(markup).not.toContain('data-textarea')
  })

  it('forwards className', () => {
    const markup = render({ value: 'x', onSubmit: () => {}, className: 'ie-cls' })
    expect(markup).toContain('ie-cls')
  })
})
