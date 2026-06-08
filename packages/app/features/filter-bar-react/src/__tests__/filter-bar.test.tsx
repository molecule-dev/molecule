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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Input: ({
    type,
    placeholder,
    value,
    ['aria-label']: ariaLabel,
  }: {
    type?: string
    placeholder?: string
    value?: string
    'aria-label'?: string
  }) =>
    createElement('input', {
      'data-input': '',
      type,
      placeholder,
      value,
      'aria-label': ariaLabel,
      readOnly: true,
    }),
  Select: ({ ['aria-label']: ariaLabel }: { 'aria-label'?: string }) =>
    createElement('select', { 'data-select': '', 'aria-label': ariaLabel }),
}))

const { FilterBar } = await import('../FilterBar.js')
import type { FilterField } from '../types.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('FilterBar', () => {
  it('renders a text input with the field label as aria-label', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const markup = html(createElement(FilterBar, { fields, values: {}, onChange: () => {} }))
    expect(markup).toContain('data-input=""')
    expect(markup).toContain('aria-label="Search"')
  })

  it('renders a select control for a select field', () => {
    const fields: FilterField[] = [
      { id: 'status', type: 'select', label: 'Status', options: [{ value: 'a', label: 'A' }] },
    ]
    const markup = html(createElement(FilterBar, { fields, values: {}, onChange: () => {} }))
    expect(markup).toContain('data-select=""')
    expect(markup).toContain('aria-label="Status"')
  })

  it('renders a multi field as a comma-joined text input', () => {
    const fields: FilterField[] = [
      { id: 'tags', type: 'multi', label: 'Tags', options: [{ value: 'x', label: 'X' }] },
    ]
    const markup = html(
      createElement(FilterBar, { fields, values: { tags: ['x', 'y'] }, onChange: () => {} }),
    )
    expect(markup).toContain('value="x, y"')
  })

  it('renders a date-range field as two date inputs with from/to aria-labels', () => {
    const fields: FilterField[] = [{ id: 'created', type: 'date-range', label: 'Created' }]
    const markup = html(createElement(FilterBar, { fields, values: {}, onChange: () => {} }))
    expect(markup).toContain('aria-label="Created from"')
    expect(markup).toContain('aria-label="Created to"')
  })

  it('renders a clear button only when onClear is supplied', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const withClear = html(
      createElement(FilterBar, { fields, values: {}, onChange: () => {}, onClear: () => {} }),
    )
    expect(withClear).toContain('Clear filters')
    const without = html(createElement(FilterBar, { fields, values: {}, onChange: () => {} }))
    expect(without).not.toContain('Clear filters')
  })

  it('renders the actions slot', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const markup = html(
      createElement(FilterBar, {
        fields,
        values: {},
        onChange: () => {},
        actions: createElement('span', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-actions=""')
  })

  it('wraps fields in a <label> showing the field label when showLabels is true', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const labeled = html(
      createElement(FilterBar, { fields, values: {}, onChange: () => {}, showLabels: true }),
    )
    expect(labeled).toContain('<label')
    expect(labeled).toContain('Search')
    const unlabeled = html(createElement(FilterBar, { fields, values: {}, onChange: () => {} }))
    expect(unlabeled).not.toContain('<label')
  })

  it('forwards className', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const markup = html(
      createElement(FilterBar, { fields, values: {}, onChange: () => {}, className: 'fb-cls' }),
    )
    expect(markup).toContain('fb-cls')
  })
})
