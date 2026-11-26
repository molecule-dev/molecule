// @vitest-environment jsdom
/**
 * i18n tests for the Vue `HttpInspector` — a port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector-i18n.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom. A `t` that
 * marks every key proves the component's own text goes through i18n, and the
 * `translate="no"` elements carrying protocol tokens and example inputs are
 * asserted on the DOM.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type PropType } from 'vue'

import type { HttpInspectorProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React tests use.
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

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The UI markers, forwarding the attributes this suite asserts on:
// aria-label, placeholder and translate.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  const button = defineComponent({
    name: 'MockButton',
    inheritAttrs: false,
    props: { disabled: { type: Boolean, default: undefined } },
    setup(props, { slots }) {
      return () => h('button', { 'data-button': '', disabled: props.disabled }, slots.default?.())
    },
  })
  const input = defineComponent({
    name: 'MockInput',
    inheritAttrs: false,
    props: { value: { type: String, default: undefined } },
    setup(props, { attrs }) {
      return () =>
        h('input', {
          'data-input': '',
          value: props.value,
          'aria-label': attrs['aria-label'],
          placeholder: attrs.placeholder,
          translate: attrs.translate,
          readOnly: true,
        })
    },
  })
  const select = defineComponent({
    name: 'MockSelect',
    inheritAttrs: false,
    props: {
      value: { type: String, default: undefined },
      options: { type: Array as PropType<{ value: string; label: string }[]>, default: () => [] },
    },
    setup(props, { attrs }) {
      return () =>
        h(
          'select',
          {
            'data-select': '',
            'data-value': props.value,
            'aria-label': attrs['aria-label'],
            translate: attrs.translate,
          },
          props.options.map((option) => h('option', { value: option.value }, [option.label])),
        )
    },
  })
  const textarea = defineComponent({
    name: 'MockTextarea',
    inheritAttrs: false,
    props: { value: { type: String, default: undefined } },
    setup(props, { attrs }) {
      return () =>
        h('textarea', {
          'data-textarea': '',
          value: props.value,
          placeholder: attrs.placeholder,
          translate: attrs.translate,
          readOnly: true,
        })
    },
  })
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: button,
    Input: input,
    Select: select,
    Textarea: textarea,
  }
})

const { HttpInspector } = await import('../HttpInspector.js')

/** The current test's mounted host element, removed after each test. */
let host: HTMLElement | null = null

afterEach(() => {
  host?.remove()
  host = null
  document.body.innerHTML = ''
})

/**
 * Renders an {@link HttpInspector} and returns the root element it produced.
 *
 * @param props - The component props.
 * @returns The rendered root element.
 */
const render = (props: HttpInspectorProps): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  host = container
  const app = createApp(
    defineComponent({
      setup: () => () => h(HttpInspector, props),
    }),
  )
  app.mount(container)
  return container.firstElementChild as HTMLElement
}

const base = {
  method: 'GET' as const,
  onMethodChange: () => {},
  url: 'https://api.test/v1',
  onUrlChange: () => {},
  headers: [{ key: 'Accept', value: 'application/json' }],
  onHeadersChange: () => {},
  body: '',
  onBodyChange: () => {},
  onSend: () => {},
}

describe('HttpInspector i18n', () => {
  it('takes the method and URL labels through i18n', () => {
    const markup = render(base).outerHTML
    expect(markup).toContain('aria-label="«httpInspector.methodLabel»"')
    expect(markup).toContain('aria-label="«httpInspector.urlLabel»"')
  })

  it('takes the header and value placeholders through i18n', () => {
    const markup = render(base).outerHTML
    expect(markup).toContain('placeholder="«httpInspector.headerPlaceholder»"')
    expect(markup).toContain('placeholder="«httpInspector.valuePlaceholder»"')
  })

  it('marks the method options as never translatable', () => {
    const markup = render(base).outerHTML
    expect(markup).toMatch(/<select[^>]*translate="no"/)
    expect(markup).toContain('>GET</option>')
  })

  it('marks the example URL and body placeholders as never translatable', () => {
    const markup = render({ ...base, method: 'POST', headers: [], body: '{}' }).outerHTML
    expect(markup).toMatch(/<input[^>]*placeholder="https:\/\/api\.example\.com[^>]*translate="no"/)
    expect(markup).toMatch(/<textarea[^>]*translate="no"/)
  })
})
