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
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Input: () => createElement('input', { 'data-input': '' }),
  Textarea: () => createElement('textarea', { 'data-textarea': '' }),
}))

const { InlineEdit } = await import('../InlineEdit.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

// The edit state only appears after a click; SSR covers the read state.
describe('InlineEdit (read state)', () => {
  it('renders the value as plain text', () => {
    const markup = html(createElement(InlineEdit, { value: 'Hello world', onSubmit: () => {} }))
    expect(markup).toContain('Hello world')
  })

  it('exposes a button role for the read-state trigger', () => {
    const markup = html(createElement(InlineEdit, { value: 'x', onSubmit: () => {} }))
    expect(markup).toContain('role="button"')
  })

  it('shows the placeholder when the value is empty', () => {
    const def = html(createElement(InlineEdit, { value: '', onSubmit: () => {} }))
    expect(def).toContain('Click to edit')
    const custom = html(
      createElement(InlineEdit, { value: '', onSubmit: () => {}, placeholder: 'Add a title' }),
    )
    expect(custom).toContain('Add a title')
  })

  it('uses renderRead to format the value when supplied', () => {
    const markup = html(
      createElement(InlineEdit, {
        value: 'raw',
        onSubmit: () => {},
        renderRead: (v) => createElement('strong', { 'data-read': '' }, v.toUpperCase()),
      }),
    )
    expect(markup).toContain('data-read=""')
    expect(markup).toContain('RAW')
  })

  it('does not render the editor inputs before being clicked', () => {
    const markup = html(createElement(InlineEdit, { value: 'x', onSubmit: () => {} }))
    expect(markup).not.toContain('data-input')
    expect(markup).not.toContain('data-textarea')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(InlineEdit, { value: 'x', onSubmit: () => {}, className: 'ie-cls' }),
    )
    expect(markup).toContain('ie-cls')
  })
})
