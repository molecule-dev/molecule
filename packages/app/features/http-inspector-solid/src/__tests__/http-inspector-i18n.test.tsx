// @vitest-environment jsdom
/**
 * i18n tests for the Solid `HttpInspector` — a port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector-i18n.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. A `t` that
 * marks every key proves the component's own text goes through i18n, and the
 * `translate="no"` elements carrying protocol tokens and example inputs are
 * asserted on the DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token — the same
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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The UI markers, forwarding the attributes this suite asserts on:
// aria-label, placeholder and translate.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: (props: { children?: JSX.Element; disabled?: boolean }) => (
    <button data-button="" disabled={props.disabled}>
      {props.children}
    </button>
  ),
  Input: (props: {
    value?: string
    'aria-label'?: string
    placeholder?: string
    translate?: string
  }) => (
    <input
      data-input=""
      attr:value={props.value}
      aria-label={props['aria-label']}
      placeholder={props.placeholder}
      attr:translate={props.translate}
      readOnly
    />
  ),
  Select: (props: {
    value?: string
    'aria-label'?: string
    translate?: string
    options?: { value: string; label: string }[]
  }) => (
    <select
      data-select=""
      data-value={props.value}
      aria-label={props['aria-label']}
      attr:translate={props.translate}
    >
      {props.options?.map((option) => (
        <option value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
  Textarea: (props: { value?: string; placeholder?: string; translate?: string }) => (
    <textarea
      data-textarea=""
      value={props.value}
      placeholder={props.placeholder}
      attr:translate={props.translate}
      readOnly
    />
  ),
}))

const { HttpInspector } = await import('../HttpInspector.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
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
    const markup = mount(() => <HttpInspector {...base} />).innerHTML
    expect(markup).toContain('aria-label="«httpInspector.methodLabel»"')
    expect(markup).toContain('aria-label="«httpInspector.urlLabel»"')
  })

  it('takes the header and value placeholders through i18n', () => {
    const markup = mount(() => <HttpInspector {...base} />).innerHTML
    expect(markup).toContain('placeholder="«httpInspector.headerPlaceholder»"')
    expect(markup).toContain('placeholder="«httpInspector.valuePlaceholder»"')
  })

  it('marks the method options as never translatable', () => {
    const markup = mount(() => <HttpInspector {...base} />).innerHTML
    expect(markup).toMatch(/<select[^>]*translate="no"/)
    expect(markup).toContain('>GET</option>')
  })

  it('marks the example URL and body placeholders as never translatable', () => {
    const markup = mount(() => (
      <HttpInspector {...base} method="POST" headers={[]} body="{}" />
    )).innerHTML
    expect(markup).toMatch(/<input[^>]*placeholder="https:\/\/api\.example\.com[^>]*translate="no"/)
    expect(markup).toMatch(/<textarea[^>]*translate="no"/)
  })
})
