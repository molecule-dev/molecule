// @vitest-environment jsdom
/**
 * Unit tests for the Vue `HttpInspector` — a port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type PropType } from 'vue'

import type { HttpInspectorProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token, so tests can
// assert which cm.* class was applied without a real bond — the same mock the
// React tests use.
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
        // A tone class carries its tone, so a test can tell `bgTone('success')`
        // from `bgTone('error')` — the real ClassMap gives each its own class.
        if (token === 'bgTone' || token === 'textTone' || token === 'borderTone')
          return (tone: unknown) => `${token}-${String(tone)}`
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

// The UI markers the React tests mock `@molecule/app-ui-react` with.
vi.mock('@molecule/app-ui-vue', async () => {
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
          },
          props.options.map((option) => h('option', { value: option.value }, [option.label])),
        )
    },
  })
  const textarea = defineComponent({
    name: 'MockTextarea',
    inheritAttrs: false,
    props: { value: { type: String, default: undefined } },
    setup(props) {
      return () => h('textarea', { 'data-textarea': '', value: props.value, readOnly: true })
    },
  })
  return { Button: button, Input: input, Select: select, Textarea: textarea }
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

describe('HttpInspector', () => {
  it('renders the method selector and URL input', () => {
    const markup = render(base).outerHTML
    expect(markup).toContain('data-select=""')
    expect(markup).toContain('aria-label="HTTP method"')
    expect(markup).toContain('aria-label="URL"')
    expect(markup).toContain('value="https://api.test/v1"')
  })

  it('renders the Send button', () => {
    const markup = render(base).outerHTML
    expect(markup).toContain('Send')
  })

  it('renders an input pair per header plus an add-header button', () => {
    const markup = render(base).outerHTML
    expect(markup).toContain('value="Accept"')
    expect(markup).toContain('value="application/json"')
    expect(markup).toContain('Add header')
  })

  it('renders the body textarea only for methods that allow a body', () => {
    expect(render(base).outerHTML).not.toContain('data-textarea')
    const post = render({ ...base, method: 'POST' }).outerHTML
    expect(post).toContain('data-textarea=""')
  })

  it('renders the response panel when a response is supplied', () => {
    const markup = render({
      ...base,
      response: { statusCode: 200, statusText: 'OK', durationMs: 42, body: '{"ok":true}' },
    }).outerHTML
    expect(markup).toContain('200 OK')
    expect(markup).toContain('42ms')
    expect(markup).toContain('{"ok":true}')
  })

  it('tones the status badge by status class', () => {
    const badge = (statusCode: number): HTMLElement => {
      const root = render({ ...base, response: { statusCode, body: '' } })
      return Array.from(root.querySelectorAll('span')).find(
        (span) => (span.textContent ?? '').trim() === String(statusCode),
      ) as HTMLElement
    }
    expect(badge(204).className).toContain('bgTone-success')
    expect(badge(302).className).toContain('bgTone-info')
    expect(badge(404).className).toContain('bgTone-warning')
    expect(badge(500).className).toContain('bgTone-error')
    // The colour is the theme's (a ClassMap class), never a literal in a style.
    expect(badge(204).className).toContain('textOnTone')
    expect(badge(204).style.backgroundColor).toBe('')
  })

  it('forwards className', () => {
    const markup = render({ ...base, className: 'hi-cls' }).outerHTML
    expect(markup).toContain('hi-cls')
  })
})
