// @vitest-environment jsdom
/**
 * Unit tests for `HttpInspector` — a port of
 * `@molecule/app-http-inspector-react/src/__tests__/http-inspector.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom), the
 * bonded ClassMap and the wired i18n provider, and asserted on the DOM the
 * component produces.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import HttpInspector from '../HttpInspector.svelte'
import type { HttpInspectorProps } from '../types.js'

/** The i18n provider a wired app supplies to the inspector. */
const i18n = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
])
setProvider(i18n)

/** The current case's root element. */
const root = (): HTMLElement => document.body.firstElementChild as HTMLElement

/**
 * Mounts `HttpInspector` in a wired molecule context.
 *
 * @param props - The inspector props.
 * @returns The rendered root element.
 */
function render(props: Partial<HttpInspectorProps> = {}): HTMLElement {
  document.body.innerHTML = ''
  mount(HttpInspector, {
    target: document.body,
    props: {
      method: 'GET',
      onMethodChange: () => {},
      url: 'https://api.test/v1',
      onUrlChange: () => {},
      headers: [{ key: 'Accept', value: 'application/json' }],
      onHeadersChange: () => {},
      body: '',
      onBodyChange: () => {},
      onSend: () => {},
      ...props,
    },
  })
  flushSync()
  return root()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('HttpInspector', () => {
  it('renders the method selector and URL input', () => {
    const el = render()
    expect(el.querySelector('select')?.getAttribute('aria-label')).toBe('HTTP method')
    expect(el.querySelector('input[aria-label="URL"]')).not.toBeNull()
    expect((el.querySelector('input[aria-label="URL"]') as HTMLInputElement).value).toBe(
      'https://api.test/v1',
    )
  })

  it('renders the Send button', () => {
    const el = render()
    expect(el.textContent).toContain('Send')
  })

  it('renders an input pair per header plus an add-header button', () => {
    const el = render()
    expect((el.querySelector('input[placeholder="Header"]') as HTMLInputElement).value).toBe(
      'Accept',
    )
    expect((el.querySelector('input[placeholder="Value"]') as HTMLInputElement).value).toBe(
      'application/json',
    )
    expect(el.textContent).toContain('Add header')
  })

  it('renders the body textarea only for methods that allow a body', () => {
    expect(render().querySelector('textarea')).toBeNull()
    expect(render({ method: 'POST' }).querySelector('textarea')).not.toBeNull()
  })

  it('renders the response panel when a response is supplied', () => {
    const el = render({
      response: { statusCode: 200, statusText: 'OK', durationMs: 42, body: '{"ok":true}' },
    })
    expect(el.textContent).toContain('200 OK')
    expect(el.textContent).toContain('42ms')
    expect(el.querySelector('pre')?.textContent).toBe('{"ok":true}')
  })

  it('tones the status badge by status class', () => {
    const badge = (statusCode: number): HTMLElement =>
      Array.from(render({ response: { statusCode, body: '' } }).querySelectorAll('span')).find(
        (span) => (span.textContent ?? '').trim() === String(statusCode),
      ) as HTMLElement
    expect(badge(204).className).toContain('bg-success')
    expect(badge(302).className).toContain('bg-info')
    expect(badge(404).className).toContain('bg-warning')
    expect(badge(500).className).toContain('bg-error')
    // The colour is the theme's (a ClassMap class), never a literal in a style.
    expect(badge(204).className).toContain('text-foreground-inverse')
    expect(badge(204).style.backgroundColor).toBe('')
  })

  it('forwards className', () => {
    expect(render({ className: 'hi-cls' }).getAttribute('class')).toContain('hi-cls')
  })
})
