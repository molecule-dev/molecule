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
  Select: ({
    value,
    options,
    ['aria-label']: ariaLabel,
  }: {
    value?: string
    options?: { value: string; label: unknown }[]
    'aria-label'?: string
  }) =>
    createElement(
      'select',
      { 'data-select': '', 'data-value': value, 'aria-label': ariaLabel },
      (options ?? []).map((o) =>
        createElement('option', { key: o.value, value: o.value }, o.label as never),
      ),
    ),
}))

const { SortPicker } = await import('../SortPicker.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const options = [
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most popular' },
]

describe('SortPicker', () => {
  it('renders the default "Sort by" label inline', () => {
    const markup = html(createElement(SortPicker, { value: 'recent', onChange: () => {}, options }))
    expect(markup).toContain('Sort by:')
    expect(markup).toContain('data-select=""')
  })

  it('honours a custom label', () => {
    const markup = html(
      createElement(SortPicker, { value: 'recent', onChange: () => {}, options, label: 'Order' }),
    )
    expect(markup).toContain('Order')
  })

  it('reflects the current value on the Select', () => {
    const markup = html(
      createElement(SortPicker, { value: 'popular', onChange: () => {}, options }),
    )
    expect(markup).toContain('data-value="popular"')
  })

  it('renders the label above the select when labelPosition is "above"', () => {
    const above = html(
      createElement(SortPicker, {
        value: 'recent',
        onChange: () => {},
        options,
        labelPosition: 'above',
      }),
    )
    // no trailing colon in the "above" layout
    expect(above).toContain('Sort by')
    expect(above).not.toContain('Sort by:')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(SortPicker, {
        value: 'recent',
        onChange: () => {},
        options,
        className: 'sp-cls',
      }),
    )
    expect(markup).toContain('sp-cls')
  })

  it('renders a ReactNode label as JSX nodes, never "[object Object]"', () => {
    const markup = html(
      createElement(SortPicker, {
        value: 'recent',
        onChange: () => {},
        options,
        // a non-string node — the classic String(node) => "[object Object]" trap
        label: createElement('strong', { 'data-testid': 'rich-label' }, 'Sort results'),
      }),
    )
    expect(markup).toContain('<strong')
    expect(markup).toContain('Sort results')
    expect(markup).not.toContain('[object Object]')
  })

  it('uses the ariaLabel prop for the select accessible name when label is a node', () => {
    const markup = html(
      createElement(SortPicker, {
        value: 'recent',
        onChange: () => {},
        options,
        label: createElement('strong', null, 'Sort'),
        ariaLabel: 'Sort the results',
      }),
    )
    expect(markup).toContain('aria-label="Sort the results"')
    expect(markup).not.toContain('[object Object]')
  })

  it('falls back to the default label string for aria-label (not a stringified node)', () => {
    const markup = html(
      createElement(SortPicker, {
        value: 'recent',
        onChange: () => {},
        options,
        label: createElement('em', null, 'Order'),
      }),
    )
    expect(markup).toContain('aria-label="Sort by"')
    expect(markup).not.toContain('[object Object]')
  })

  it('renders each option label as option text (no coercion artifacts)', () => {
    const markup = html(createElement(SortPicker, { value: 'recent', onChange: () => {}, options }))
    expect(markup).toContain('Most recent')
    expect(markup).toContain('Most popular')
    expect(markup).not.toContain('[object Object]')
  })
})
