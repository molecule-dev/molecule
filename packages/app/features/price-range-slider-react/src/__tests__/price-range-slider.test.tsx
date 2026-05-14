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

const { PriceRangeSlider } = await import('../PriceRangeSlider.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('PriceRangeSlider', () => {
  it('renders two range inputs with min/max aria-labels', () => {
    const markup = html(
      createElement(PriceRangeSlider, { min: 0, max: 100, value: [20, 80], onChange: () => {} }),
    )
    expect(markup.match(/type="range"/g) ?? []).toHaveLength(2)
    expect(markup).toContain('aria-label="Minimum"')
    expect(markup).toContain('aria-label="Maximum"')
  })

  it('reflects the value tuple on the two range inputs', () => {
    const markup = html(
      createElement(PriceRangeSlider, { min: 0, max: 100, value: [25, 75], onChange: () => {} }),
    )
    expect(markup).toContain('value="25"')
    expect(markup).toContain('value="75"')
  })

  it('formats the endpoint labels as USD currency by default', () => {
    const markup = html(
      createElement(PriceRangeSlider, {
        min: 0,
        max: 5000,
        value: [1000, 4000],
        onChange: () => {},
      }),
    )
    expect(markup).toContain('$1,000')
    expect(markup).toContain('$4,000')
  })

  it('uses a custom formatValue when supplied', () => {
    const markup = html(
      createElement(PriceRangeSlider, {
        min: 0,
        max: 100,
        value: [10, 90],
        onChange: () => {},
        formatValue: (n) => `${n}pts`,
      }),
    )
    expect(markup).toContain('10pts')
    expect(markup).toContain('90pts')
  })

  it('renders the label when present and omits it otherwise', () => {
    expect(
      html(
        createElement(PriceRangeSlider, {
          min: 0,
          max: 10,
          value: [1, 9],
          onChange: () => {},
          label: 'Price range',
        }),
      ),
    ).toContain('Price range')
    expect(
      html(createElement(PriceRangeSlider, { min: 0, max: 10, value: [1, 9], onChange: () => {} })),
    ).not.toContain('Price range')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(PriceRangeSlider, {
        min: 0,
        max: 10,
        value: [1, 9],
        onChange: () => {},
        className: 'prs-cls',
      }),
    )
    expect(markup).toContain('prs-cls')
  })
})
