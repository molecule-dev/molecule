import type { ReactNode } from 'react'
import { createElement } from 'react'
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

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The same markers the main suite's mocks render, plus the attributes this
// suite asserts on: aria-label, placeholder and translate.
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Input: (props: {
    value?: string
    'aria-label'?: string
    placeholder?: string
    translate?: string
  }) =>
    createElement('input', {
      'data-input': '',
      value: props.value,
      'aria-label': props['aria-label'],
      placeholder: props.placeholder,
      translate: props.translate,
      readOnly: true,
    }),
  Select: (props: {
    value?: string
    'aria-label'?: string
    translate?: string
    options?: { value: string; label: string }[]
  }) =>
    createElement(
      'select',
      {
        'data-select': '',
        'data-value': props.value,
        'aria-label': props['aria-label'],
        translate: props.translate,
      },
      props.options?.map((option) =>
        createElement('option', { value: option.value }, option.label),
      ),
    ),
  Textarea: (props: { value?: string; placeholder?: string; translate?: string }) =>
    createElement('textarea', {
      'data-textarea': '',
      value: props.value,
      placeholder: props.placeholder,
      translate: props.translate,
      readOnly: true,
    }),
}))

const { HttpInspector } = await import('../HttpInspector.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

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
    const markup = html(createElement(HttpInspector, base))
    expect(markup).toContain('aria-label="«httpInspector.methodLabel»"')
    expect(markup).toContain('aria-label="«httpInspector.urlLabel»"')
  })

  it('takes the header and value placeholders through i18n', () => {
    const markup = html(createElement(HttpInspector, base))
    expect(markup).toContain('placeholder="«httpInspector.headerPlaceholder»"')
    expect(markup).toContain('placeholder="«httpInspector.valuePlaceholder»"')
  })

  it('marks the method options as never translatable', () => {
    const markup = html(createElement(HttpInspector, base))
    expect(markup).toMatch(/<select\b[^>]*\btranslate="no"/)
    expect(markup).toContain('<option value="GET">GET</option>')
  })

  it('marks the example URL and body placeholders as never translatable', () => {
    const markup = html(
      createElement(HttpInspector, { ...base, method: 'POST', headers: [], body: '{}' }),
    )
    expect(markup).toMatch(
      /<input\b[^>]*placeholder="https:\/\/api\.example\.com[^>]*\btranslate="no"/,
    )
    expect(markup).toMatch(/<textarea\b[^>]*\btranslate="no"/)
  })
})
