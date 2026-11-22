// @vitest-environment jsdom
/**
 * Unit tests for the Solid `HttpInspector` — a port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* class was applied without a real bond — the same mock the
// React package's own tests use.
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The UI markers the React tests mock `@molecule/app-ui-react` with.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element; disabled?: boolean }) => (
    <button data-button="" disabled={props.disabled}>
      {props.children}
    </button>
  ),
  Input: (props: { value?: string; 'aria-label'?: string }) => (
    <input data-input="" attr:value={props.value} aria-label={props['aria-label']} readOnly />
  ),
  Select: (props: {
    value?: string
    'aria-label'?: string
    options?: { value: string; label: string }[]
  }) => (
    <select data-select="" data-value={props.value} aria-label={props['aria-label']}>
      {props.options?.map((option) => (
        <option value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
  Textarea: (props: { value?: string }) => (
    <textarea data-textarea="" value={props.value} readOnly />
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

describe('HttpInspector', () => {
  it('renders the method selector and URL input', () => {
    const markup = mount(() => <HttpInspector {...base} />).innerHTML
    expect(markup).toContain('data-select=""')
    expect(markup).toContain('aria-label="HTTP method"')
    expect(markup).toContain('aria-label="URL"')
    expect(markup).toContain('value="https://api.test/v1"')
  })

  it('renders the Send button', () => {
    const markup = mount(() => <HttpInspector {...base} />).innerHTML
    expect(markup).toContain('Send')
  })

  it('renders an input pair per header plus an add-header button', () => {
    const markup = mount(() => <HttpInspector {...base} />).innerHTML
    expect(markup).toContain('value="Accept"')
    expect(markup).toContain('value="application/json"')
    expect(markup).toContain('Add header')
  })

  it('renders the body textarea only for methods that allow a body', () => {
    expect(mount(() => <HttpInspector {...base} />).innerHTML).not.toContain('data-textarea')
    const post = mount(() => <HttpInspector {...base} method="POST" />).innerHTML
    expect(post).toContain('data-textarea=""')
  })

  it('renders the response panel when a response is supplied', () => {
    const markup = mount(() => (
      <HttpInspector
        {...base}
        response={{ statusCode: 200, statusText: 'OK', durationMs: 42, body: '{"ok":true}' }}
      />
    )).innerHTML
    expect(markup).toContain('200 OK')
    expect(markup).toContain('42ms')
    expect(markup).toContain('{"ok":true}')
  })

  it('tones the status badge by status class', () => {
    const badge = (statusCode: number): HTMLElement =>
      Array.from(
        mount(() => (
          <HttpInspector {...base} response={{ statusCode, body: '' }} />
        )).querySelectorAll('span'),
      ).find((span) => (span.textContent ?? '').trim() === String(statusCode)) as HTMLElement
    expect(badge(204).className).toContain('bgTone-success')
    expect(badge(302).className).toContain('bgTone-info')
    expect(badge(404).className).toContain('bgTone-warning')
    expect(badge(500).className).toContain('bgTone-error')
    // The colour is the theme's (a ClassMap class), never a literal in a style.
    expect(badge(204).className).toContain('textOnTone')
    expect(badge(204).style.backgroundColor).toBe('')
  })

  it('forwards className', () => {
    const markup = mount(() => <HttpInspector {...base} className="hi-cls" />).innerHTML
    expect(markup).toContain('hi-cls')
  })
})
