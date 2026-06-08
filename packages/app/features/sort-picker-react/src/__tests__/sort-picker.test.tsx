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
  Select: ({ value, ['aria-label']: ariaLabel }: { value?: string; 'aria-label'?: string }) =>
    createElement('select', { 'data-select': '', 'data-value': value, 'aria-label': ariaLabel }),
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
})
