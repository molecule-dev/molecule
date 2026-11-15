// @vitest-environment jsdom
/**
 * Unit tests for the Vue `CopyLinkField` — a port of
 * `@molecule/app-copy-link-field-react/src/__tests__/copy-link-field.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element rendering its default slot.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: {
        variant: String,
        size: String,
        onClick: { type: Function, default: undefined },
      },
      setup(props, { slots }) {
        return () =>
          h('button', { 'data-button': '', type: 'button', onClick: props.onClick }, [
            slots.default?.(),
          ])
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import { CopyLinkField } from '../CopyLinkField.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link CopyLinkField} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(CopyLinkField, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const markup = render({ value: 'https://x.test/abc' })
    expect(markup).toContain('value="https://x.test/abc"')
    expect(markup).toContain('readonly')
  })

  it('renders the label when present and omits it otherwise', () => {
    expect(render({ value: 'u', label: 'Webhook URL' })).toContain('Webhook URL')
    const without = render({ value: 'u' })
    expect(without).not.toContain('Webhook URL')
  })

  it('uses the label as the input aria-label, falling back to a default', () => {
    expect(render({ value: 'u', label: 'API key' })).toContain('aria-label="API key"')
    expect(render({ value: 'u' })).toContain('aria-label="Link"')
  })

  it('renders the copy button with its default label', () => {
    const markup = render({ value: 'u' })
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('forwards className', () => {
    const markup = render({ value: 'u', className: 'clf-cls' })
    expect(markup).toContain('clf-cls')
  })
})
