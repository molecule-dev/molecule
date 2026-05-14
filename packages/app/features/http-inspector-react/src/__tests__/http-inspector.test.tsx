import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Input: ({ value, ['aria-label']: ariaLabel }: { value?: string; 'aria-label'?: string }) =>
    createElement('input', { 'data-input': '', value, 'aria-label': ariaLabel, readOnly: true }),
  Select: ({ value, ['aria-label']: ariaLabel }: { value?: string; 'aria-label'?: string }) =>
    createElement('select', { 'data-select': '', 'data-value': value, 'aria-label': ariaLabel }),
  Textarea: ({ value }: { value?: string }) =>
    createElement('textarea', { 'data-textarea': '', value, readOnly: true }),
}))

const { HttpInspector } = await import('../HttpInspector.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

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
    const markup = html(createElement(HttpInspector, base))
    expect(markup).toContain('data-select=""')
    expect(markup).toContain('aria-label="HTTP method"')
    expect(markup).toContain('aria-label="URL"')
    expect(markup).toContain('value="https://api.test/v1"')
  })

  it('renders the Send button', () => {
    const markup = html(createElement(HttpInspector, base))
    expect(markup).toContain('Send')
  })

  it('renders an input pair per header plus an add-header button', () => {
    const markup = html(createElement(HttpInspector, base))
    expect(markup).toContain('value="Accept"')
    expect(markup).toContain('value="application/json"')
    expect(markup).toContain('Add header')
  })

  it('renders the body textarea only for methods that allow a body', () => {
    expect(html(createElement(HttpInspector, base))).not.toContain('data-textarea')
    const post = html(createElement(HttpInspector, { ...base, method: 'POST' }))
    expect(post).toContain('data-textarea=""')
  })

  it('renders the response panel when a response is supplied', () => {
    const markup = html(
      createElement(HttpInspector, {
        ...base,
        response: { statusCode: 200, statusText: 'OK', durationMs: 42, body: '{"ok":true}' },
      }),
    )
    expect(markup).toContain('200 OK')
    expect(markup).toContain('42ms')
    expect(markup).toContain('{&quot;ok&quot;:true}')
  })

  it('colors the status badge by status class', () => {
    const ok = html(
      createElement(HttpInspector, {
        ...base,
        response: { statusCode: 204, body: '' },
      }),
    )
    expect(ok).toContain('#22c55e')
    const err = html(
      createElement(HttpInspector, {
        ...base,
        response: { statusCode: 500, body: '' },
      }),
    )
    expect(err).toContain('#ef4444')
  })

  it('forwards className', () => {
    const markup = html(createElement(HttpInspector, { ...base, className: 'hi-cls' }))
    expect(markup).toContain('hi-cls')
  })
})
